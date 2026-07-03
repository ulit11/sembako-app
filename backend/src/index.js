const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const auth = require('./middleware/auth');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';

// In-memory verification codes storage
const pendingRegistrations = new Map();
const pendingPasswordResets = new Map();

async function sendEmail(to, subject, html) {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.warn('[EMAIL WARNING] BREVO_API_KEY is not set. Email will not be sent.');
      return;
    }
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        sender: { name: "RMS Sembako", email: "agung.ulit@gmail.com" },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[EMAIL SENT VIA HTTP] to: ${to}, messageId:`, data.messageId);
    } else {
      const errData = await response.json().catch(() => ({}));
      console.error(`[EMAIL ERROR VIA HTTP] failed response from Brevo:`, errData);
    }
  } catch (error) {
    console.error(`[EMAIL ERROR VIA HTTP] failed to send email to ${to}:`, error.message);
  }
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ================= AUTHENTICATION ENDPOINTS =================

// 1. Register User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Nama, Email, dan Password wajib diisi.' });
    }

    // Check if user already exists
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({ error: 'Email sudah terdaftar.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name
      }
    });

    // Generate JWT
    const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server saat mendaftar.' });
  }
});

// 2. Login User (Supports Email or Username/Name)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { password } = req.body;
    const identifier = req.body.identifier || req.body.email;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/Username dan Password wajib diisi.' });
    }

    // Find user by email OR name (username)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { name: identifier }
        ]
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Email/Username atau password salah.' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Email/Username atau password salah.' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        parentId: user.parentId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server saat login.' });
  }
});

// Helper: Generate 6-digit OTP
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// 2a. Request Email Verification (OTP Registration)
app.post('/api/auth/register-request', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Nama, Email, dan Password wajib diisi.' });
    }

    // Check if user already exists
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({ error: 'Email sudah terdaftar.' });
    }

    // Generate OTP
    const otp = generateOtp();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    // Save temporarily in memory
    pendingRegistrations.set(email, { name, email, password, otp, expires });

    // Send verification email (non-blocking)
    sendEmail(
      email,
      'Verifikasi Pendaftaran Akun RMS Sembako',
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1976D2; margin: 0;">RMS Sembako</h2>
          <p style="color: #757575; margin: 5px 0 0 0;">Rosi Malaju Sentosa</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin-bottom: 20px;" />
        <div style="color: #212121; font-size: 16px; line-height: 1.5;">
          <p>Halo <strong>${name}</strong>,</p>
          <p>Terima kasih telah melakukan pendaftaran di RMS Sembako. Berikut adalah kode verifikasi OTP Anda:</p>
          <div style="background-color: #f5f5f5; text-align: center; padding: 15px; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1976D2; border-radius: 4px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="font-size: 14px; color: #757575;">Kode ini berlaku selama 10 menit. Jangan bagikan kode ini kepada siapapun demi keamanan akun Anda.</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin-top: 25px; margin-bottom: 15px;" />
        <div style="text-align: center; font-size: 12px; color: #9e9e9e;">
          &copy; 2026 Rosi Malaju Sentosa (RMS Sembako). All Rights Reserved.
        </div>
      </div>`
    );

    res.json({
      message: 'OTP verifikasi telah dikirim ke email.',
      email,
      otp // Return OTP in response for client-side demo/testing simulation
    });
  } catch (error) {
    console.error('Register request error:', error);
    res.status(500).json({ error: 'Gagal mengirim OTP pendaftaran.' });
  }
});

// 2b. Verify OTP and Complete Registration
app.post('/api/auth/register-verify', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email dan Kode OTP wajib diisi.' });
    }

    const pending = pendingRegistrations.get(email);
    if (!pending) {
      return res.status(400).json({ error: 'Tidak ada permintaan pendaftaran untuk email ini.' });
    }

    if (Date.now() > pending.expires) {
      pendingRegistrations.delete(email);
      return res.status(400).json({ error: 'Kode OTP telah kadaluarsa. Silakan daftar kembali.' });
    }

    if (pending.otp !== otp) {
      return res.status(400).json({ error: 'Kode OTP yang Anda masukkan salah.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(pending.password, 10);

    // Create user in DB
    const newUser = await prisma.user.create({
      data: {
        email: pending.email,
        password: hashedPassword,
        name: pending.name
      }
    });

    // Remove from in-memory pending map
    pendingRegistrations.delete(email);

    // Generate JWT
    const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name
      }
    });
  } catch (error) {
    console.error('Register verify error:', error);
    res.status(500).json({ error: 'Gagal memverifikasi pendaftaran.' });
  }
});

// 2c. Request Forgot Password OTP
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email wajib diisi.' });
    }

    // Check if user exists in database
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Email tidak terdaftar di sistem.' });
    }

    // Generate OTP
    const otp = generateOtp();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save reset request in memory
    pendingPasswordResets.set(email, { otp, expires });

    // Send password reset email (non-blocking)
    sendEmail(
      email,
      'Reset Kata Sandi Akun RMS Sembako',
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1976D2; margin: 0;">RMS Sembako</h2>
          <p style="color: #757575; margin: 5px 0 0 0;">Rosi Malaju Sentosa</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin-bottom: 20px;" />
        <div style="color: #212121; font-size: 16px; line-height: 1.5;">
          <p>Halo <strong>${user.name}</strong>,</p>
          <p>Kami menerima permintaan untuk mereset kata sandi akun Anda. Berikut adalah kode verifikasi OTP reset kata sandi Anda:</p>
          <div style="background-color: #f5f5f5; text-align: center; padding: 15px; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #d32f2f; border-radius: 4px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="font-size: 14px; color: #757575;">Kode ini berlaku selama 10 menit. Jika Anda tidak merasa meminta reset kata sandi, abaikan email ini.</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin-top: 25px; margin-bottom: 15px;" />
        <div style="text-align: center; font-size: 12px; color: #9e9e9e;">
          &copy; 2026 Rosi Malaju Sentosa (RMS Sembako). All Rights Reserved.
        </div>
      </div>`
    );

    res.json({
      message: 'OTP reset kata sandi telah dikirim ke email.',
      email,
      otp // Return OTP in response for client-side demo/testing simulation
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Gagal memproses lupa kata sandi.' });
  }
});

// 2d. Verify Reset Password OTP and Change Password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, dan Kata Sandi Baru wajib diisi.' });
    }

    const resetRequest = pendingPasswordResets.get(email);
    if (!resetRequest) {
      return res.status(400).json({ error: 'Tidak ada permintaan reset sandi untuk email ini.' });
    }

    if (Date.now() > resetRequest.expires) {
      pendingPasswordResets.delete(email);
      return res.status(400).json({ error: 'Kode OTP reset sandi telah kadaluarsa.' });
    }

    if (resetRequest.otp !== otp) {
      return res.status(400).json({ error: 'Kode OTP yang Anda masukkan salah.' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user in DB
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    // Remove from in-memory pending map
    pendingPasswordResets.delete(email);

    res.json({ message: 'Kata sandi berhasil diperbarui. Silakan login kembali.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Gagal memperbarui kata sandi.' });
  }
});

// 3. Get Current User Profile (Protected)
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    if (req.user.role === 'KASIR') {
      const owner = await prisma.user.findUnique({
        where: { id: req.user.parentId },
        select: {
          name: true,
          qrisImage: true,
          bankName: true,
          bankAccount: true,
          bankAccountName: true
        }
      });
      if (owner) {
        return res.json({
          ...req.user,
          storeName: owner.name,
          qrisImage: owner.qrisImage,
          bankName: owner.bankName,
          bankAccount: owner.bankAccount,
          bankAccountName: owner.bankAccountName
        });
      }
    }
    
    // Default Owner or fallback
    res.json({
      ...req.user,
      storeName: req.user.name
    });
  } catch (error) {
    console.error('Error fetching user me:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat memproses profil pengguna.' });
  }
});

// 3.01 Update Owner Shop Settings (Protected - Owner only)
app.put('/api/auth/settings', auth, async (req, res) => {
  try {
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Akses ditolak. Hanya Pemilik Toko (Owner) yang dapat mengubah pengaturan.' });
    }

    const { name, qrisImage, bankName, bankAccount, bankAccountName } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name !== undefined ? name : undefined,
        qrisImage: qrisImage !== undefined ? qrisImage : undefined,
        bankName: bankName !== undefined ? bankName : undefined,
        bankAccount: bankAccount !== undefined ? bankAccount : undefined,
        bankAccountName: bankAccountName !== undefined ? bankAccountName : undefined
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        parentId: true,
        qrisImage: true,
        bankName: true,
        bankAccount: true,
        bankAccountName: true,
        balance: true
      }
    });

    res.json({
      message: 'Pengaturan toko berhasil diperbarui.',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server saat memperbarui pengaturan.' });
  }
});

// 3.1 Owner Registers a Cashier (Protected - Owner only)
app.post('/api/auth/cashier', auth, async (req, res) => {
  try {
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Akses ditolak. Hanya Pemilik Toko (Owner) yang dapat mendaftarkan Kasir.' });
    }

    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Semua kolom (Email, Password, Nama) wajib diisi.' });
    }

    // Check if email already registered
    const emailExists = await prisma.user.findUnique({ where: { email } });
    if (emailExists) {
      return res.status(400).json({ error: 'Email sudah terdaftar.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create cashier linked to this Owner
    const newCashier = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'KASIR',
        parentId: req.user.id
      }
    });

    res.status(201).json({
      message: 'Akun Kasir berhasil didaftarkan.',
      user: {
        id: newCashier.id,
        email: newCashier.email,
        name: newCashier.name,
        role: newCashier.role
      }
    });
  } catch (error) {
    console.error('Register cashier error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server saat mendaftarkan kasir.' });
  }
});

// 3.2 List Owner's Cashiers (Protected - Owner only)
app.get('/api/auth/cashiers', auth, async (req, res) => {
  try {
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Akses ditolak.' });
    }

    const cashiers = await prisma.user.findMany({
      where: { parentId: req.user.id, role: 'KASIR' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });

    res.json(cashiers);
  } catch (error) {
    console.error('Fetch cashiers error:', error);
    res.status(500).json({ error: 'Internal server error while fetching cashiers' });
  }
});

// ================= SECURED PRODUCT CRUD ENDPOINTS =================

// Helper to get store owner ID (parentId for cashiers, id for owners)
const getStoreId = (user) => {
  return user.role === 'KASIR' ? user.parentId : user.id;
};

// 4. Get stats for dashboard (Protected)
app.get('/api/stats', auth, async (req, res) => {
  try {
    const storeId = getStoreId(req.user);

    const products = await prisma.product.findMany({ where: { userId: storeId } });
    
    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const categoryCounts = {
      "Beras & Sembako": 0,
      "Minyak & Mentega": 0,
      "Mi & Instan": 0,
      "Bumbu Dapur": 0,
      "Minuman": 0,
      "Sabun & Mandi": 0,
      "Lainnya": 0
    };

    products.forEach(p => {
      totalStockValue += p.stock * p.costPrice;
      if (p.stock === 0) {
        outOfStockCount++;
      } else if (p.stock <= p.minStock) {
        lowStockCount++;
      }
      
      const cat = p.category || "Lainnya";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    res.json({
      totalProducts: products.length,
      totalStockValue,
      lowStockCount,
      outOfStockCount,
      categoryCounts
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error while fetching stats' });
  }
});

// 5. Get all products (Protected, filtered by user store)
app.get('/api/products', auth, async (req, res) => {
  try {
    const storeId = getStoreId(req.user);
    const { search, category, stockStatus } = req.query;

    const where = { userId: storeId };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { barcode: { contains: search } }
      ];
    }
    if (category) {
      where.category = category;
    }
    if (stockStatus === 'out_of_stock') {
      where.stock = 0;
    }

    let products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    if (stockStatus === 'low_stock') {
      products = products.filter(p => p.stock > 0 && p.stock <= p.minStock);
    } else if (stockStatus === 'restock') {
      products = products.filter(p => p.stock <= p.minStock);
    }

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error while fetching products' });
  }
});

// 6. Get product by ID (Protected)
app.get('/api/products/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const storeId = getStoreId(req.user);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const product = await prisma.product.findFirst({
      where: { id, userId: storeId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found or unauthorized' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 7. Create product (Protected - Owner only)
app.post('/api/products', auth, async (req, res) => {
  try {
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Akses ditolak. Hanya Pemilik Toko (Owner) yang dapat menambahkan barang.' });
    }

    const storeId = getStoreId(req.user);
    const { barcode, name, description, stock, minStock, costPrice, sellPrice, unit, category } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Nama produk wajib diisi' });
    }
    if (costPrice === undefined || sellPrice === undefined) {
      return res.status(400).json({ error: 'Harga modal dan harga jual wajib diisi' });
    }

    const barcodeValue = (barcode && barcode.trim() !== '') ? barcode.trim() : null;

    // Check barcode duplicate
    if (barcodeValue) {
      const barcodeExists = await prisma.product.findFirst({ where: { barcode: barcodeValue, userId: storeId } });
      if (barcodeExists) {
        return res.status(400).json({ error: `Produk dengan barcode ${barcodeValue} sudah terdaftar (${barcodeExists.name})` });
      }
    }

    const newProduct = await prisma.product.create({
      data: {
        barcode: barcodeValue,
        name,
        description: description || "",
        stock: stock !== undefined ? parseInt(stock) : 0,
        minStock: minStock !== undefined ? parseInt(minStock) : 5,
        costPrice: parseFloat(costPrice),
        sellPrice: parseFloat(sellPrice),
        unit: unit || "pcs",
        category: category || "Lainnya",
        userId: storeId
      }
    });

    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error while creating product' });
  }
});

// 7b. Load Sembako Template (Protected - Restricted to test accounts)
app.post('/api/products/load-template', auth, async (req, res) => {
  try {
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Akses ditolak. Hanya Pemilik Toko (Owner) yang dapat memuat template.' });
    }

    const allowedEmails = ['watisulistiyo69@gmail.com', 'agung.ulit@gmail.com'];
    if (!allowedEmails.includes(req.user.email)) {
      return res.status(403).json({ error: 'Fitur template ini sementara hanya tersedia untuk akun uji coba khusus.' });
    }

    const storeId = getStoreId(req.user);

    const templates = [
      // === BAHAN POKOK ===
      { name: "Minyak Goreng Bimoli Refill 1L", barcode: "8992007111018", category: "Minyak & Mentega", costPrice: 17500, sellPrice: 20000, unit: "L", description: "Minyak goreng Bimoli pouch 1 liter" },
      { name: "Minyak Goreng Bimoli Refill 2L", barcode: "8992007111025", category: "Minyak & Mentega", costPrice: 34500, sellPrice: 38500, unit: "L", description: "Minyak goreng Bimoli pouch 2 liter" },
      { name: "Minyak Goreng Sania Refill 1L", barcode: "8992819200206", category: "Minyak & Mentega", costPrice: 17000, sellPrice: 19500, unit: "L", description: "Minyak goreng Sania pouch 1 liter" },
      { name: "Minyak Goreng Sania Refill 2L", barcode: "8992819200213", category: "Minyak & Mentega", costPrice: 33000, sellPrice: 37500, unit: "L", description: "Minyak goreng Sania pouch 2 liter" },
      { name: "Minyak Goreng Filma Refill 2L", barcode: "8998009010189", category: "Minyak & Mentega", costPrice: 34000, sellPrice: 38000, unit: "L", description: "Minyak goreng Filma pouch 2 liter" },
      { name: "Minyak Goreng Tropical Botol 2L", barcode: "8992222045615", category: "Minyak & Mentega", costPrice: 35000, sellPrice: 39000, unit: "L", description: "Minyak goreng Tropical botol 2 liter" },
      { name: "Mentega Blue Band Serbaguna 200g", barcode: "8999999014560", category: "Minyak & Mentega", costPrice: 9000, sellPrice: 11000, unit: "pcs", description: "Margarin Blue Band sachet 200g" },
      
      { name: "Gula Pasir Gulaku Premium 1kg", barcode: "8992745100018", category: "Beras & Sembako", costPrice: 15000, sellPrice: 18000, unit: "kg", description: "Gula pasir Gulaku kemasan premium 1kg" },
      { name: "Gula Pasir Gulaku Kuning Tebu 1kg", barcode: "8992745100025", category: "Beras & Sembako", costPrice: 14500, sellPrice: 17500, unit: "kg", description: "Gula pasir Gulaku kuning tebu alami 1kg" },
      { name: "Gula Merah Jawa 500g", barcode: null, category: "Beras & Sembako", costPrice: 10000, sellPrice: 13000, unit: "pcs", description: "Gula Jawa batangan isi 500g" },
      { name: "Terigu Segitiga Biru 1kg", barcode: "8998866100214", category: "Beras & Sembako", costPrice: 11000, sellPrice: 13500, unit: "kg", description: "Tepung terigu serbaguna Segitiga Biru 1kg" },
      { name: "Terigu Cakra Kembar 1kg", barcode: "8998866100221", category: "Beras & Sembako", costPrice: 11500, sellPrice: 14000, unit: "kg", description: "Tepung terigu protein tinggi Cakra Kembar 1kg" },
      { name: "Tepung Tapioka Rose Brand 500g", barcode: "8992742100110", category: "Beras & Sembako", costPrice: 6500, sellPrice: 8500, unit: "pcs", description: "Tepung tapioka/aci Rose Brand 500g" },
      { name: "Tepung Beras Rose Brand 500g", barcode: "8992742100127", category: "Beras & Sembako", costPrice: 7000, sellPrice: 9000, unit: "pcs", description: "Tepung beras Rose Brand 500g" },
      { name: "Beras Ramos IR64 5kg", barcode: "8999909201018", category: "Beras & Sembako", costPrice: 65000, sellPrice: 75000, unit: "karung", description: "Beras Ramos kemasan karung 5kg" },
      { name: "Beras Ramos IR64 10kg", barcode: "8999909201025", category: "Beras & Sembako", costPrice: 128000, sellPrice: 145000, unit: "karung", description: "Beras Ramos kemasan karung 10kg" },
      { name: "Beras Pandan Wangi Cianjur 5kg", barcode: "8999909202053", category: "Beras & Sembako", costPrice: 72000, sellPrice: 85000, unit: "karung", description: "Beras pulen Pandan Wangi asli Cianjur 5kg" },
      { name: "Telur Ayam Negeri 1kg", barcode: null, category: "Beras & Sembako", costPrice: 25000, sellPrice: 28000, unit: "kg", description: "Telur ayam ras negeri segar per kg" },
      { name: "Telur Bebek Mentah", barcode: null, category: "Beras & Sembako", costPrice: 3000, sellPrice: 4000, unit: "butir", description: "Telur bebek segar per butir" },

      // === MI INSTAN, POP MIE & MAKANAN RINGAN ===
      { name: "Indomie Mi Instan Goreng 85g", barcode: "089686010098", category: "Mi & Instan", costPrice: 2800, sellPrice: 3500, unit: "pcs", description: "Indomie Goreng Rasa Spesial" },
      { name: "Indomie Rasa Soto Mie 70g", barcode: "089686010142", category: "Mi & Instan", costPrice: 2700, sellPrice: 3300, unit: "pcs", description: "Indomie Kuah Rasa Soto Mie" },
      { name: "Indomie Rasa Ayam Bawang 75g", barcode: "089686010128", category: "Mi & Instan", costPrice: 2700, sellPrice: 3300, unit: "pcs", description: "Indomie Kuah Rasa Ayam Bawang" },
      { name: "Indomie Rasa Kari Ayam 72g", barcode: "089686010159", category: "Mi & Instan", costPrice: 2900, sellPrice: 3600, unit: "pcs", description: "Indomie Kuah Rasa Kari Ayam dengan Bumbu Pasta" },
      { name: "Indomie Goreng Rasa Aceh 90g", barcode: "089686060130", category: "Mi & Instan", costPrice: 2900, sellPrice: 3600, unit: "pcs", description: "Indomie Goreng Rasa Khas Aceh Tebal" },
      { name: "Indomie Goreng Rasa Rendang 91g", barcode: "089686015505", category: "Mi & Instan", costPrice: 2900, sellPrice: 3600, unit: "pcs", description: "Indomie Goreng Rasa Rendang khas Minang" },
      { name: "Indomie Goreng Sambal Matah 85g", barcode: "089686043132", category: "Mi & Instan", costPrice: 2900, sellPrice: 3600, unit: "pcs", description: "Indomie Goreng Rasa Sambal Matah Khas Bali" },
      { name: "Indomie Goreng Hype Abis Ayam Geprek 85g", barcode: "089686043231", category: "Mi & Instan", costPrice: 2900, sellPrice: 3600, unit: "pcs", description: "Indomie Goreng Hype Abis Rasa Ayam Geprek Pedas" },
      { name: "Indomie Rasa Kaldu Ayam 75g", barcode: "089686010111", category: "Mi & Instan", costPrice: 2600, sellPrice: 3200, unit: "pcs", description: "Indomie kuah kaldu ayam klasik" },
      { name: "Indomie Rasa Ayam Spesial 75g", barcode: "089686010135", category: "Mi & Instan", costPrice: 2700, sellPrice: 3300, unit: "pcs", description: "Indomie kuah rasa ayam spesial gurih" },
      { name: "Mie Sedaap Goreng 90g", barcode: "8998866200549", category: "Mi & Instan", costPrice: 2700, sellPrice: 3300, unit: "pcs", description: "Mie Sedaap Goreng dengan kriuk bawang" },
      { name: "Mie Sedaap Rasa Soto 75g", barcode: "8998866200518", category: "Mi & Instan", costPrice: 2750, sellPrice: 3300, unit: "pcs", description: "Mie Sedaap Kuah Rasa Soto Koya" },
      { name: "Mie Sedaap Kari Spesial 75g", barcode: "8998866200525", category: "Mi & Instan", costPrice: 2850, sellPrice: 3500, unit: "pcs", description: "Mie Sedaap Kuah Kari Spesial Kental" },
      { name: "Sarimi Duo Rasa Ayam Bawang 115g", barcode: "089686010340", category: "Mi & Instan", costPrice: 3300, sellPrice: 4000, unit: "pcs", description: "Sarimi porsi dobel rasa Ayam Bawang" },
      { name: "Supermi Rasa Ayam Bawang 70g", barcode: "089686010012", category: "Mi & Instan", costPrice: 2600, sellPrice: 3200, unit: "pcs", description: "Supermi kuah rasa ayam bawang klasik" },
      { name: "Bihun Jagung Pilihan Miki 350g", barcode: "8992742110034", category: "Mi & Instan", costPrice: 6000, sellPrice: 8000, unit: "pcs", description: "Bihun jagung kering isi 4 keping" },
      { name: "Pop Mie Cup Rasa Baso 75g", barcode: "089686020028", category: "Mi & Instan", costPrice: 4300, sellPrice: 5000, unit: "cup", description: "Pop Mie kuah rasa baso sapi" },
      { name: "Pop Mie Cup Rasa Soto Ayam 75g", barcode: "089686020042", category: "Mi & Instan", costPrice: 4300, sellPrice: 5000, unit: "cup", description: "Pop Mie kuah rasa soto ayam hangat" },
      { name: "Pop Mie Cup Rasa Ayam Bawang 75g", barcode: "089686020011", category: "Mi & Instan", costPrice: 4300, sellPrice: 5000, unit: "cup", description: "Pop Mie kuah rasa ayam bawang gurih" },
      { name: "Pop Mie Cup Goreng Spesial 80g", barcode: "089686020257", category: "Mi & Instan", costPrice: 4500, sellPrice: 5500, unit: "cup", description: "Pop Mie goreng rasa spesial" },
      { name: "Pop Mie Pedas Dower Rasa Ayam Pedas 75g", barcode: "089686003250", category: "Mi & Instan", costPrice: 4600, sellPrice: 5500, unit: "cup", description: "Pop Mie rasa ayam pedas dower ekstra pedas" },
      { name: "Sarden ABC Saus Tomat 155g", barcode: "8991389170123", category: "Lainnya", costPrice: 8500, sellPrice: 10500, unit: "kaleng", description: "Sarden kaleng ABC rasa tomat kecil" },
      { name: "Sarden ABC Saus Tomat 425g", barcode: "8991389170246", category: "Lainnya", costPrice: 19500, sellPrice: 23000, unit: "kaleng", description: "Sarden kaleng ABC rasa tomat besar" },
      { name: "Biskuit Roma Kelapa 300g", barcode: "8996001301018", category: "Lainnya", costPrice: 8500, sellPrice: 11000, unit: "pcs", description: "Biskuit Roma kelapa gurih" },
      { name: "Oreo Sandwich Vanilla 133g", barcode: "7622210390123", category: "Lainnya", costPrice: 7500, sellPrice: 9500, unit: "pcs", description: "Biskuit Oreo isi krim vanilla" },
      { name: "Khong Guan Assorted Biscuits 650g", barcode: "8992015100011", category: "Lainnya", costPrice: 48000, sellPrice: 55000, unit: "kaleng", description: "Biskuit aneka rasa Khong Guan Kaleng Merah" },

      // === MINUMAN, KOPI SACHET & SUSU ===
      { name: "Aqua Air Mineral Botol 600ml", barcode: "8886008101053", category: "Minuman", costPrice: 2500, sellPrice: 3500, unit: "botol", description: "Air mineral Aqua tanggung 600ml" },
      { name: "Aqua Air Mineral Botol 1500ml", barcode: "8886008101077", category: "Minuman", costPrice: 5000, sellPrice: 6500, unit: "botol", description: "Air mineral Aqua besar 1.5L" },
      { name: "Aqua Galon 19L (Isi Ulang)", barcode: "8886008101015", category: "Minuman", costPrice: 18000, sellPrice: 22000, unit: "galon", description: "Isi ulang air galon Aqua asli" },
      { name: "Le Minerale Air Mineral Botol 600ml", barcode: "8997009460226", category: "Minuman", costPrice: 2300, sellPrice: 3200, unit: "botol", description: "Air mineral Le Minerale botol 600ml" },
      { name: "Le Minerale Air Mineral Botol 1500ml", barcode: "8997009460233", category: "Minuman", costPrice: 4600, sellPrice: 6000, unit: "botol", description: "Air mineral Le Minerale botol 1.5L" },
      { name: "Teh Pucuk Harum 350ml", barcode: "8992222055621", category: "Minuman", costPrice: 3000, sellPrice: 4000, unit: "botol", description: "Teh melati manis Teh Pucuk Harum" },
      { name: "Coca Cola Botol 390ml", barcode: "8992741120027", category: "Minuman", costPrice: 4300, sellPrice: 5500, unit: "botol", description: "Minuman bersoda Coca Cola botol kecil" },
      { name: "Fanta Strawberry Botol 390ml", barcode: "8992741130026", category: "Minuman", costPrice: 4300, sellPrice: 5500, unit: "botol", description: "Minuman bersoda Fanta rasa stroberi kecil" },
      { name: "Sprite Botol 390ml", barcode: "8992741140025", category: "Minuman", costPrice: 4300, sellPrice: 5500, unit: "botol", description: "Minuman bersoda Sprite rasa lemon-lime kecil" },
      { name: "Kopi Kapal Api Special Mix (Renteng)", barcode: "8991002101234", category: "Minuman", costPrice: 11500, sellPrice: 13500, unit: "renteng", description: "Kopi bubuk Kapal Api sachet isi 10" },
      { name: "Kopi Kapal Api Mantap Hitam (Renteng)", barcode: "8991002101111", category: "Minuman", costPrice: 10500, sellPrice: 12500, unit: "renteng", description: "Kopi hitam manis Kapal Api renteng isi 10" },
      { name: "Kopi Luwak White Koffie (Renteng)", barcode: "8991206101018", category: "Minuman", costPrice: 12000, sellPrice: 14500, unit: "renteng", description: "Kopi Luwak White Koffie sachet isi 10" },
      { name: "Kopi Torabika Duo (Renteng)", barcode: "8996001401015", category: "Minuman", costPrice: 11000, sellPrice: 13000, unit: "renteng", description: "Kopi Torabika hitam manis sachet isi 10" },
      { name: "Kopi Torabika Creamy Latte (Renteng)", barcode: "8996001402227", category: "Minuman", costPrice: 13500, sellPrice: 16000, unit: "renteng", description: "Kopi latte Torabika dengan gula terpisah isi 10" },
      { name: "Kopi ABC Susu (Renteng)", barcode: "8991002120020", category: "Minuman", costPrice: 12000, sellPrice: 14000, unit: "renteng", description: "Kopi ABC Susu sachet renteng isi 10" },
      { name: "Kopi ABC Mocca (Renteng)", barcode: "8991002120037", category: "Minuman", costPrice: 12000, sellPrice: 14000, unit: "renteng", description: "Kopi ABC Mocca sachet renteng isi 10" },
      { name: "Kopi Good Day Moccacino (Renteng)", barcode: "8991002230040", category: "Minuman", costPrice: 12500, sellPrice: 15000, unit: "renteng", description: "Kopi Good Day rasa moccacino isi 10" },
      { name: "Kopi Good Day Caribbean Nut (Renteng)", barcode: "8991002230057", category: "Minuman", costPrice: 12500, sellPrice: 15000, unit: "renteng", description: "Kopi Good Day rasa hazelnut karibia isi 10" },
      { name: "Kopi Neo Coffee Tiramisu (Renteng)", barcode: "8991002250109", category: "Minuman", costPrice: 10000, sellPrice: 12000, unit: "renteng", description: "Kopi Neo Coffee rasa tiramisu isi 10" },
      { name: "Kopi Indocafe Coffeemix (Renteng)", barcode: "8998811101235", category: "Minuman", costPrice: 13000, sellPrice: 15500, unit: "renteng", description: "Kopi 3-in-1 Indocafe Coffeemix isi 10" },
      { name: "Kopi Caffino Classic (Renteng)", barcode: "8997232230101", category: "Minuman", costPrice: 12000, sellPrice: 14500, unit: "renteng", description: "Kopi latte Caffino Classic isi 10" },
      { name: "Teh Celup Sariwangi Isi 25", barcode: "8999999023456", category: "Minuman", costPrice: 5500, sellPrice: 7000, unit: "pcs", description: "Teh celup hitam Sariwangi kotak isi 25" },
      { name: "Frisian Flag Kental Manis Putih Kaleng 370g", barcode: "8992753100017", category: "Minuman", costPrice: 11000, sellPrice: 13000, unit: "kaleng", description: "Susu kental manis Frisian Flag putih kaleng" },
      { name: "Frisian Flag Kental Manis Cokelat Kaleng 370g", barcode: "8992753100024", category: "Minuman", costPrice: 11000, sellPrice: 13000, unit: "kaleng", description: "Susu kental manis Frisian Flag cokelat kaleng" },
      { name: "Indomilk Kental Manis Putih Kaleng 370g", barcode: "8991001100238", category: "Minuman", costPrice: 10800, sellPrice: 12500, unit: "kaleng", description: "Susu kental manis Indomilk putih kaleng" },
      { name: "Susu UHT Ultra Milk Full Cream 1L", barcode: "8992009110019", category: "Minuman", costPrice: 16500, sellPrice: 19500, unit: "box", description: "Susu sapi Ultra Milk cair Full Cream 1 liter" },
      { name: "Susu UHT Ultra Milk Cokelat 1L", barcode: "8992009110026", category: "Minuman", costPrice: 16500, sellPrice: 19500, unit: "box", description: "Susu sapi Ultra Milk cair Cokelat 1 liter" },
      { name: "Susu Steril Bear Brand Kaleng 189ml", barcode: "7613032120018", category: "Minuman", costPrice: 8900, sellPrice: 10500, unit: "kaleng", description: "Susu steril beruang Bear Brand kaleng" },

      // === BUMBU DAPUR & PENYEDAP ===
      { name: "Kecap Manis Bango Pouch 220ml", barcode: "8999999057635", category: "Bumbu Dapur", costPrice: 9000, sellPrice: 11000, unit: "pcs", description: "Kecap manis Bango pouch kecil" },
      { name: "Kecap Manis Bango Pouch 550ml", barcode: "8999999057642", category: "Bumbu Dapur", costPrice: 20000, sellPrice: 23500, unit: "pcs", description: "Kecap manis Bango pouch besar" },
      { name: "Kecap Manis ABC Pouch 225ml", barcode: "8991389100021", category: "Bumbu Dapur", costPrice: 8500, sellPrice: 10500, unit: "pcs", description: "Kecap manis ABC pouch hitam" },
      { name: "Royco Kaldu Ayam 120g", barcode: "8999999050018", category: "Bumbu Dapur", costPrice: 4500, sellPrice: 5500, unit: "pcs", description: "Penyedap rasa kaldu ayam Royco" },
      { name: "Royco Kaldu Sapi 120g", barcode: "8999999050025", category: "Bumbu Dapur", costPrice: 4500, sellPrice: 5500, unit: "pcs", description: "Penyedap rasa kaldu sapi Royco" },
      { name: "Masako Kaldu Ayam 100g", barcode: "8992770051011", category: "Bumbu Dapur", costPrice: 4200, sellPrice: 5200, unit: "pcs", description: "Penyedap rasa kaldu ayam Masako" },
      { name: "Masako Kaldu Sapi 100g", barcode: "8992770051028", category: "Bumbu Dapur", costPrice: 4200, sellPrice: 5200, unit: "pcs", description: "Penyedap rasa kaldu sapi Masako" },
      { name: "Penyedap Sasa MSG Gurih 100g", barcode: "8992742120019", category: "Bumbu Dapur", costPrice: 4000, sellPrice: 5000, unit: "pcs", description: "Penyedap masakan MSG Sasa" },
      { name: "Ajinomoto MSG Penyedap 100g", barcode: "8992770011015", category: "Bumbu Dapur", costPrice: 4100, sellPrice: 5000, unit: "pcs", description: "Penyedap rasa MSG Ajinomoto" },
      { name: "Tepung Bumbu Sasa Serbaguna 80g", barcode: "8992742120033", category: "Bumbu Dapur", costPrice: 2000, sellPrice: 3000, unit: "pcs", description: "Tepung bumbu bumbu kering Sasa" },
      { name: "Lada Bubuk Ladaku (Renteng)", barcode: "8997003001012", category: "Bumbu Dapur", costPrice: 9500, sellPrice: 11000, unit: "renteng", description: "Lada putih bubuk murni sachet isi 12" },
      { name: "Saus Sambal ABC Asli Botol 135ml", barcode: "8991389140027", category: "Bumbu Dapur", costPrice: 6500, sellPrice: 8000, unit: "botol", description: "Saus cabe sambal pedas asli ABC" },
      { name: "Saus Sambal ABC Asli Botol 335ml", barcode: "8991389140058", category: "Bumbu Dapur", costPrice: 14000, sellPrice: 17000, unit: "botol", description: "Saus cabe sambal pedas asli ABC besar" },
      { name: "Saus Tomat ABC Botol 135ml", barcode: "8991389150026", category: "Bumbu Dapur", costPrice: 6500, sellPrice: 8000, unit: "botol", description: "Saus tomat manis ABC botol" },
      { name: "Garam Dapur Segitiga G 250g", barcode: "8991234567890", category: "Bumbu Dapur", costPrice: 2000, sellPrice: 3000, unit: "pcs", description: "Garam meja halus beryodium" },

      // === KEBUTUHAN RUMAH TANGGA / SABUN / SHAMPO ===
      { name: "Sunlight Jeruk Nipis Refill 650ml", barcode: "8999999041238", category: "Sabun & Mandi", costPrice: 13500, sellPrice: 16000, unit: "pcs", description: "Cairan pencuci piring Sunlight pouch" },
      { name: "Mama Lemon Jeruk Nipis Refill 680ml", barcode: "8998866300416", category: "Sabun & Mandi", costPrice: 12500, sellPrice: 15000, unit: "pcs", description: "Cairan pencuci piring Mama Lemon" },
      { name: "Rinso Liquid Deterjen Refill 700ml", barcode: "8999999034568", category: "Sabun & Mandi", costPrice: 18000, sellPrice: 22000, unit: "pcs", description: "Rinso deterjen cair botol/pouch" },
      { name: "Rinso Bubuk Anti Noda 700g", barcode: "8999999034513", category: "Sabun & Mandi", costPrice: 17500, sellPrice: 21500, unit: "pcs", description: "Rinso deterjen bubuk klasik 700g" },
      { name: "Daia Deterjen Bubuk Putih 800g", barcode: "8998866601018", category: "Sabun & Mandi", costPrice: 14000, sellPrice: 17000, unit: "pcs", description: "Deterjen bubuk Daia wangi bersih" },
      { name: "Pembersih Lantai So Klin Citrus Refill 780ml", barcode: "8998866700216", category: "Sabun & Mandi", costPrice: 10500, sellPrice: 13000, unit: "pcs", description: "Pembersih lantai wangi So Klin" },
      { name: "Karbol Wangi Wipol Refill 750ml", barcode: "8999999046783", category: "Sabun & Mandi", costPrice: 14500, sellPrice: 18000, unit: "pcs", description: "Karbol disinfektan lantai Wipol pinus" },
      { name: "Sabun Lifebuoy Merah Batang 110g", barcode: "8999999012344", category: "Sabun & Mandi", costPrice: 3500, sellPrice: 4500, unit: "pcs", description: "Sabun mandi batang Lifebuoy Red" },
      { name: "Sabun Giv Putih Batang 76g", barcode: "8998866400512", category: "Sabun & Mandi", costPrice: 2800, sellPrice: 4000, unit: "pcs", description: "Sabun mandi wangi Giv White" },
      { name: "Sabun Dettol Original Batang 100g", barcode: "8991122330018", category: "Sabun & Mandi", costPrice: 5000, sellPrice: 6500, unit: "pcs", description: "Sabun mandi antiseptik Dettol" },
      { name: "Pepsodent Pasta Gigi Cavity 190g", barcode: "8999999002345", category: "Sabun & Mandi", costPrice: 10500, sellPrice: 13000, unit: "pcs", description: "Pasta gigi Pepsodent putih besar" },
      { name: "Close Up Pasta Gigi Menthol 160g", barcode: "8999999002369", category: "Sabun & Mandi", costPrice: 12500, sellPrice: 15500, unit: "pcs", description: "Pasta gigi Close Up gel hijau segar" },
      { name: "Shampoo Pantene Anti Dandruff 150ml", barcode: "4902430901234", category: "Sabun & Mandi", costPrice: 18500, sellPrice: 22000, unit: "botol", description: "Sampo Pantene anti ketombe" },
      { name: "Shampoo Clear Men Menthol 160ml", barcode: "8999999031246", category: "Sabun & Mandi", costPrice: 20000, sellPrice: 24500, unit: "botol", description: "Sampo khusus pria Clear Men" },
      { name: "Shampoo Sunsilk Black Shine 160ml", barcode: "8999999032519", category: "Sabun & Mandi", costPrice: 17500, sellPrice: 21500, unit: "botol", description: "Sampo Sunsilk urang aring hitam" },

      // === PRODUK ROKOK (LAINNYA) ===
      { name: "Rokok Sampoerna A Mild 16", barcode: "8999909003889", category: "Lainnya", costPrice: 32000, sellPrice: 35000, unit: "bungkus", description: "Rokok Sampoerna A Mild isi 16 batang" },
      { name: "Rokok Gudang Garam Filter 12", barcode: "8998989100125", category: "Lainnya", costPrice: 23000, sellPrice: 25000, unit: "bungkus", description: "Rokok Gudang Garam Filter isi 12 batang" },
      { name: "Rokok Gudang Garam Surya 16", barcode: "8998989300167", category: "Lainnya", costPrice: 30000, sellPrice: 33000, unit: "bungkus", description: "Rokok Gudang Garam Surya isi 16 batang" },
      { name: "Rokok Djarum Super 16", barcode: "8992689200164", category: "Lainnya", costPrice: 31000, sellPrice: 34000, unit: "bungkus", description: "Rokok Djarum Super isi 16 batang" },
      { name: "Rokok Marlboro Merah 20", barcode: "7622100723467", category: "Lainnya", costPrice: 41000, sellPrice: 45000, unit: "bungkus", description: "Rokok Marlboro Filter Red isi 20 batang" },
      { name: "Rokok Dji Sam Soe 234 Kretek 12", barcode: "8999909001038", category: "Lainnya", costPrice: 19000, sellPrice: 21000, unit: "bungkus", description: "Rokok kretek Dji Sam Soe isi 12 batang" },
      { name: "Rokok LA Bold 20", barcode: "8992689001556", category: "Lainnya", costPrice: 31000, sellPrice: 33000, unit: "bungkus", description: "Rokok LA Bold filter hitam isi 20 batang" },

      // === LAIN-LAIN ===
      { name: "Baygon Aerosol Fresh Scent 600ml", barcode: "8999999023412", category: "Lainnya", costPrice: 32000, sellPrice: 38000, unit: "botol", description: "Obat nyamuk semprot Baygon jumbo" },
      { name: "Tissue Paseo Smart 250 Sheets", barcode: "8993053011019", category: "Lainnya", costPrice: 11000, sellPrice: 14000, unit: "pcs", description: "Tisu wajah Paseo kemasan hemat 250 lembar" }
    ];

    let createdCount = 0;
    for (const t of templates) {
      if (t.barcode) {
        const dup = await prisma.product.findFirst({
          where: { barcode: t.barcode, userId: storeId }
        });
        if (dup) continue;
      } else {
        const dup = await prisma.product.findFirst({
          where: { name: t.name, userId: storeId }
        });
        if (dup) continue;
      }

      await prisma.product.create({
        data: {
          ...t,
          stock: 0,
          minStock: 5,
          userId: storeId
        }
      });
      createdCount++;
    }

    res.json({ message: `Berhasil memuat ${createdCount} produk template sembako.` });
  } catch (error) {
    console.error('Error loading template:', error);
    res.status(500).json({ error: 'Gagal memuat template produk.' });
  }
});

// 7c. Batch Import Products (Protected - Restricted to test accounts)
app.post('/api/products/batch', auth, async (req, res) => {
  try {
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Akses ditolak. Hanya Pemilik Toko (Owner) yang dapat mengimpor barang.' });
    }

    const allowedEmails = ['watisulistiyo69@gmail.com', 'agung.ulit@gmail.com'];
    if (!allowedEmails.includes(req.user.email)) {
      return res.status(403).json({ error: 'Fitur import massal ini sementara hanya tersedia untuk akun uji coba khusus.' });
    }

    const storeId = getStoreId(req.user);
    const { products } = req.body;

    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Format data tidak valid. Wajib berupa array produk.' });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const { barcode, name, description, stock, minStock, costPrice, sellPrice, unit, category } = p;

      if (!name || name.trim() === '') {
        errorCount++;
        errors.push(`Baris ${i + 1}: Nama produk kosong`);
        continue;
      }

      if (costPrice === undefined || sellPrice === undefined || isNaN(parseFloat(costPrice)) || isNaN(parseFloat(sellPrice))) {
        errorCount++;
        errors.push(`Baris ${i + 1} (${name}): Harga modal atau harga jual wajib berupa angka`);
        continue;
      }

      const barcodeValue = (barcode && String(barcode).trim() !== '') ? String(barcode).trim() : null;

      if (barcodeValue) {
        const dup = await prisma.product.findFirst({
          where: { barcode: barcodeValue, userId: storeId }
        });
        if (dup) {
          errorCount++;
          errors.push(`Baris ${i + 1} (${name}): Barcode ${barcodeValue} sudah terdaftar (${dup.name})`);
          continue;
        }
      } else {
        const dup = await prisma.product.findFirst({
          where: { name: name.trim(), userId: storeId }
        });
        if (dup) {
          errorCount++;
          errors.push(`Baris ${i + 1} (${name}): Produk dengan nama ini sudah terdaftar`);
          continue;
        }
      }

      await prisma.product.create({
        data: {
          barcode: barcodeValue,
          name: name.trim(),
          description: description || "",
          stock: stock !== undefined ? parseInt(stock) : 0,
          minStock: minStock !== undefined ? parseInt(minStock) : 5,
          costPrice: parseFloat(costPrice),
          sellPrice: parseFloat(sellPrice),
          unit: unit || "pcs",
          category: category || "Lainnya",
          userId: storeId
        }
      });
      successCount++;
    }

    res.json({
      message: `Berhasil mengimpor ${successCount} produk.`,
      successCount,
      errorCount,
      errors
    });
  } catch (error) {
    console.error('Error importing batch products:', error);
    res.status(500).json({ error: 'Gagal mengimpor produk secara massal.' });
  }
});

// 8. Update product (Protected - Owner only)
app.put('/api/products/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Akses ditolak. Hanya Pemilik Toko (Owner) yang dapat mengedit barang.' });
    }

    const id = parseInt(req.params.id);
    const storeId = getStoreId(req.user);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const { barcode, name, description, stock, minStock, costPrice, sellPrice, unit, category } = req.body;

    // Check if product exists and belongs to store
    const productExists = await prisma.product.findFirst({ where: { id, userId: storeId } });
    if (!productExists) {
      return res.status(404).json({ error: 'Product not found or unauthorized' });
    }

    const barcodeValue = barcode !== undefined ? ((barcode && barcode.trim() !== '') ? barcode.trim() : null) : undefined;

    // Check barcode duplicate
    if (barcodeValue && barcodeValue !== productExists.barcode) {
      const barcodeExists = await prisma.product.findFirst({ where: { barcode: barcodeValue, userId: storeId, NOT: { id } } });
      if (barcodeExists) {
        return res.status(400).json({ error: `Produk dengan barcode ${barcodeValue} sudah terdaftar (${barcodeExists.name})` });
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        barcode: barcodeValue,
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        stock: stock !== undefined ? parseInt(stock) : undefined,
        minStock: minStock !== undefined ? parseInt(minStock) : undefined,
        costPrice: costPrice !== undefined ? parseFloat(costPrice) : undefined,
        sellPrice: sellPrice !== undefined ? parseFloat(sellPrice) : undefined,
        unit: unit !== undefined ? unit : undefined,
        category: category !== undefined ? category : undefined
      }
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Internal server error while updating product' });
  }
});

// 9. Delete product (Protected - Owner only)
app.delete('/api/products/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Akses ditolak. Hanya Pemilik Toko (Owner) yang dapat menghapus barang.' });
    }

    const id = parseInt(req.params.id);
    const storeId = getStoreId(req.user);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    // Check if product exists and belongs to store
    const productExists = await prisma.product.findFirst({ where: { id, userId: storeId } });
    if (!productExists) {
      return res.status(404).json({ error: 'Product not found or unauthorized' });
    }

    await prisma.$transaction(async (prismaTx) => {
      // 1. Delete all referencing transaction items first to prevent foreign key errors
      await prismaTx.transactionItem.deleteMany({
        where: { productId: id }
      });
      // 2. Delete the product itself
      await prismaTx.product.delete({
        where: { id }
      });
    });

    res.json({ message: 'Product deleted successfully', id });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Internal server error while deleting product' });
  }
});

// ================= SECURED TRANSACTION API ENDPOINTS =================

// 10. Create Transaction (Checkout)
app.post('/api/transactions', auth, async (req, res) => {
  try {
    const storeId = getStoreId(req.user);
    const { paymentMethod, customerName, items } = req.body;

    if (!paymentMethod || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Metode pembayaran dan barang belanjaan wajib diisi.' });
    }

    if (paymentMethod === 'Bon' && (!customerName || customerName.trim() === '')) {
      return res.status(400).json({ error: 'Nama pelanggan wajib diisi untuk pembayaran Bon/Utang.' });
    }

    // Fetch products involved
    const productIds = items.map(item => item.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, userId: storeId }
    });

    const productMap = new Map(dbProducts.map(p => [p.id, p]));

    // Validate stock and build items list
    const validatedItems = [];
    let totalPrice = 0;

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return res.status(400).json({ error: `Barang dengan ID ${item.productId} tidak ditemukan.` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Stok barang "${product.name}" tidak mencukupi (Tersisa: ${product.stock} ${product.unit}).` });
      }

      validatedItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.sellPrice
      });

      totalPrice += product.sellPrice * item.quantity;
    }

    // Perform database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Deduct stock for each item
      for (const item of validatedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        });
      }

      // 2. Create Transaction
      const newTransaction = await tx.transaction.create({
        data: {
          totalPrice,
          paymentMethod,
          status: (paymentMethod === 'QRIS' || paymentMethod === 'Transfer') ? 'PENDING' : 'SUCCESS',
          customerName: customerName || "",
          userId: storeId, // Link to owner's store
          items: {
            create: validatedItems.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price
            }))
          }
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      return newTransaction;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server saat memproses transaksi.' });
  }
});

// 10.1 Get Transaction Status (Protected)
app.get('/api/transactions/:id/status', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const storeId = getStoreId(req.user);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    const tx = await prisma.transaction.findFirst({
      where: { id, userId: storeId },
      select: { status: true }
    });
    if (!tx) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan atau unauthorized.' });
    }
    res.json({ status: tx.status });
  } catch (error) {
    console.error('Error fetching transaction status:', error);
    res.status(500).json({ error: 'Internal server error while fetching transaction status' });
  }
});

// 10.2 Simulate QRIS/Transfer Payment Callback (Public - Simulation Webhook)
app.post('/api/transactions/:id/simulate-pay', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    const tx = await prisma.transaction.findUnique({
      where: { id }
    });
    if (!tx) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
    }
    if (tx.status === 'SUCCESS') {
      return res.json({ message: 'Pembayaran sudah sukses sebelumnya.', transaction: tx });
    }
    
    // Update transaction to SUCCESS and increment owner's balance in a transaction
    const result = await prisma.$transaction(async (prismaTx) => {
      const updatedTx = await prismaTx.transaction.update({
        where: { id },
        data: { status: 'SUCCESS' },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      // Increment owner's balance
      await prismaTx.user.update({
        where: { id: updatedTx.userId },
        data: {
          balance: {
            increment: updatedTx.totalPrice
          }
        }
      });

      return updatedTx;
    });

    res.json({ message: 'Pembayaran berhasil disimulasikan.', transaction: result });
  } catch (error) {
    console.error('Error simulating payment:', error);
    res.status(500).json({ error: 'Internal server error during payment simulation' });
  }
});

// 10.3 Cancel/Delete Pending Transaction (Protected)
app.delete('/api/transactions/:id/cancel', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const storeId = getStoreId(req.user);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    const tx = await prisma.transaction.findFirst({
      where: { id, userId: storeId, status: 'PENDING' },
      include: { items: true }
    });
    if (!tx) {
      return res.status(404).json({ error: 'Transaksi pending tidak ditemukan atau sudah selesai.' });
    }
    
    // Perform database transaction to delete and restore stock
    await prisma.$transaction(async (prismaTx) => {
      // Restore stock for each item
      for (const item of tx.items) {
        await prismaTx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity
            }
          }
        });
      }
      // Delete transaction items and transaction
      await prismaTx.transactionItem.deleteMany({
        where: { transactionId: id }
      });
      await prismaTx.transaction.delete({
        where: { id }
      });
    });
    
    res.json({ message: 'Transaksi berhasil dibatalkan dan stok dikembalikan.' });
  } catch (error) {
    console.error('Error canceling transaction:', error);
    res.status(500).json({ error: 'Internal server error while canceling transaction' });
  }
});

// 11. Get all transactions (Protected - completed transactions only)
app.get('/api/transactions', auth, async (req, res) => {
  try {
    const storeId = getStoreId(req.user);
    const { paymentMethod, search } = req.query;

    const where = { userId: storeId, status: 'SUCCESS' };

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }
    if (search) {
      where.customerName = { contains: search };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                unit: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error while fetching transactions' });
  }
});

// 11.1 Update Transaction Payment Method (Protected - e.g. pelunasan Bon)
app.put('/api/transactions/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const storeId = getStoreId(req.user);
    const { paymentMethod } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ error: 'Metode pembayaran wajib diisi.' });
    }

    // Check if transaction exists and belongs to store
    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: storeId }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan atau unauthorized.' });
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: { paymentMethod }
    });

    res.json(updatedTransaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Internal server error while updating transaction' });
  }
});

// 12. Get Compiled Reports (Protected - Owner only)
app.get('/api/reports', auth, async (req, res) => {
  try {
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Akses ditolak. Hanya Pemilik Toko (Owner) yang dapat mengakses laporan keuangan.' });
    }

    const storeId = getStoreId(req.user);
    const { filterRange } = req.query;

    const now = new Date();
    let dateQuery = {};

    if (filterRange === 'hari_ini') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateQuery = {
        createdAt: {
          gte: startOfDay
        }
      };
    } else if (filterRange === 'minggu_ini') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateQuery = {
        createdAt: {
          gte: sevenDaysAgo
        }
      };
    } else if (filterRange === 'bulan_ini') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateQuery = {
        createdAt: {
          gte: thirtyDaysAgo
        }
      };
    }

    // 1. Fetch transactions within date range (completed/success only)
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: storeId,
        status: 'SUCCESS',
        ...dateQuery
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    let totalRevenue = 0;
    let totalCogs = 0;
    const byPaymentMethod = { Tunai: 0, QRIS: 0, Bon: 0 };
    const bonList = [];

    transactions.forEach(t => {
      totalRevenue += t.totalPrice;
      byPaymentMethod[t.paymentMethod] = (byPaymentMethod[t.paymentMethod] || 0) + t.totalPrice;

      t.items.forEach(item => {
        totalCogs += item.quantity * (item.product?.costPrice || 0);
      });

      if (t.paymentMethod === 'Bon') {
        bonList.push({
          id: t.id,
          customerName: t.customerName,
          totalPrice: t.totalPrice,
          createdAt: t.createdAt
        });
      }
    });

    const netProfit = totalRevenue - totalCogs;

    // 2. Fetch current stock assets
    const products = await prisma.product.findMany({
      where: { userId: storeId }
    });

    let totalStockValueModal = 0;
    let totalStockValueJual = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;

    products.forEach(p => {
      totalStockValueModal += p.stock * p.costPrice;
      totalStockValueJual += p.stock * p.sellPrice;
      if (p.stock === 0) {
        outOfStockCount++;
      } else if (p.stock <= p.minStock) {
        lowStockCount++;
      }
    });

    const potentialProfit = totalStockValueJual - totalStockValueModal;

    res.json({
      sales: {
        totalRevenue,
        totalTransactions: transactions.length,
        byPaymentMethod,
        bonList,
        transactions: transactions.map(t => ({
          id: t.id,
          totalPrice: t.totalPrice,
          paymentMethod: t.paymentMethod,
          customerName: t.customerName,
          createdAt: t.createdAt,
          itemCount: t.items.reduce((acc, item) => acc + item.quantity, 0)
        }))
      },
      profitAndLoss: {
        revenue: totalRevenue,
        cogs: totalCogs,
        netProfit
      },
      stock: {
        totalStockValueModal,
        totalStockValueJual,
        potentialProfit,
        outOfStockCount,
        lowStockCount,
        totalUniqueProducts: products.length
      }
    });
  } catch (error) {
    console.error('Error compiling reports:', error);
    res.status(500).json({ error: 'Internal server error while compiling reports' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

app.listen(PORT, () => {
  console.log(`🚀 Express server running on http://localhost:${PORT}`);
});
