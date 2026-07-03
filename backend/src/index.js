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

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'agung.ulit@gmail.com',
    pass: 'ywalknpzrehgglod'
  }
});

async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: '"RMS Sembako" <agung.ulit@gmail.com>',
      to,
      subject,
      html
    });
    console.log(`[EMAIL SENT] to: ${to}, subject: ${subject}`);
  } catch (error) {
    console.error(`[EMAIL ERROR] failed to send email to ${to}:`, error);
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

    // Send verification email
    await sendEmail(
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

    // Send password reset email
    await sendEmail(
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
