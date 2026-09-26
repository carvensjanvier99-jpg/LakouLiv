const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Konfigirasyon pou nou ka li enfòmasyon ki soti nan fòm yo (Forms)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Konfigirasyon EJS pou paj yo
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Konfigirasyon Session pou itilizatè yo ka rete konekte
app.use(session({
    secret: 'lakouliv_secret_key_2026',
    resave: false,
    saveUninitialized: true
}));

// Middleware pou jere lang yo (Français pa defo)
app.use((req, res, next) => {
    if (!req.session.lang) {
        req.session.lang = 'fr';
    }
    res.locals.lang = req.session.lang;
    res.locals.user = req.session.user || null;
    next();
});

// Konfigirasyon pou sove foto kouvèti ak PDF yo (Multer)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'pdf') {
            cb(null, 'secure_uploads/pdfs/');
        } else {
            cb(null, 'public/uploads/covers/');
        }
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Asire ke dosye yo egziste pou pa gen erè
const dirPdfs = './secure_uploads/pdfs';
const dirCovers = './public/uploads/covers';
const dirData = './data';
if (!fs.existsSync(dirPdfs)) fs.mkdirSync(dirPdfs, { recursive: true });
if (!fs.existsSync(dirCovers)) fs.mkdirSync(dirCovers, { recursive: true });
if (!fs.existsSync(dirData)) fs.mkdirSync(dirData, { recursive: true });

// Fonksyon pou li ak ekri nan fichye JSON yo
const getBooks = () => {
    const filePath = './data/livres.json';
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([]));
    return JSON.parse(fs.readFileSync(filePath));
};
const saveBooks = (books) => fs.writeFileSync('./data/livres.json', JSON.stringify(books, null, 2));

const getUsers = () => {
    const filePath = './data/utilisateurs.json';
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([]));
    return JSON.parse(fs.readFileSync(filePath));
};
const saveUsers = (users) => fs.writeFileSync('./data/utilisateurs.json', JSON.stringify(users, null, 2));

// ================= ROUTES SIT LA =================

// Route pou chanje lang
app.get('/lang/:lang', (req, res) => {
    if (['fr', 'kr'].includes(req.params.lang)) {
        req.session.lang = req.params.lang;
    }
    res.redirect('back');
});

// Paj Akèy (Marketplace dinamik)
app.get('/', (req, res) => {
    const books = getBooks().filter(b => b.published === true);
    res.render('index', { books: books });
});

// Route Sekirize pou Telechaje PDF la (Moun ki pa peye pa ka jwenn li)
app.get('/download/:bookId', (req, res) => {
    if (!req.session.user) return res.status(403).send("Silvouplè, konekte ou. / S'il vous plaît, connectez-vous.");
    
    const users = getUsers();
    const currentUser = users.find(u => u.id === req.session.user.id);
    
    if (!currentUser || !currentUser.library.includes(req.params.bookId)) {
        return res.status(403).send("Ou dwe achte liv sa a anvan. / Accès refusé. Vous devez d'abord acheter ce livre.");
    }
    
    const book = getBooks().find(b => b.id === req.params.bookId);
    if (!book) return res.status(404).send("Liv la introuvable.");
    
    const filePath = path.join(__dirname, 'secure_uploads', 'pdfs', book.pdfFilename);
    res.download(filePath, `${book.title}.pdf`);
});

// Admin Dashboard - Login Paj
app.get('/admin/login', (req, res) => res.render('admin-login'));

app.post('/admin/login', (req, res) => {
    const { email, password } = req.body;
    if (email === 'lakouliv@gmail.com' && password === 'Admin2026!') {
        req.session.user = { id: 'admin', email: email, role: 'admin' };
        return res.redirect('/admin/dashboard');
    }
    res.send("Enfòmasyon kòrèk.");
});

// Admin Dashboard - Paj Jesyon
app.get('/admin/dashboard', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/admin/login');
    const books = getBooks();
    res.render('admin-dashboard', { books: books });
});

// Ajoute yon liv depi nan Admin
app.post('/admin/book/add', upload.fields([{ name: 'cover', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.sendStatus(403);
    
    const { title, author, description, price, category } = req.body;
    const books = getBooks();
    
    const newBook = {
        id: Date.now().toString(),
        title,
        author,
        description,
        price: parseFloat(price),
        category,
        coverUrl: '/uploads/covers/' + req.files['cover'].filename,
        pdfFilename: req.files['pdf'].filename,
        published: true,
        rating: 5
    };
    
    books.push(newBook);
    saveBooks(books);
    res.redirect('/admin/dashboard');
});

// Lanse Sèvè a
app.listen(PORT, () => {
    console.log(`Sèvè a ap kouri sou http://localhost:${PORT}`);
});
