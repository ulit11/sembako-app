const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
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

    if (!user) {
      return res.status(401).json({ error: 'Akses ditolak. Pengguna tidak ditemukan.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ error: 'Akses ditolak. Token tidak valid.' });
  }
};

module.exports = auth;
