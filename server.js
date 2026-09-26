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

// Kreyasyon dosye yo otomatikman pou evite erè
const dirPdfs = path.join(__dirname, 'secure_uploads', 'pdfs');
const dirCovers = path.join(__dirname, 'public', 'uploads', 'covers');
const dirData = path.join(__dirname, 'data');

if (!fs.existsSync(dirPdfs)) fs.mkdirSync(dirPdfs, { recursive: true });
if (!fs.existsSync(dirCovers)) fs.mkdirSync(dirCovers, { recursive: true });
if (!fs.existsSync(dirData)) fs.mkdirSync(dirData, { recursive: true });

// Piblikasyon dosye statik yo
app.use(express.static(path.join(__dirname, 'public')));

// Konfigirasyon EJS pou paj yo
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Konfigirasyon Session
app.use(session({
    secret: 'lakouliv_secret_key_2026',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Mete l a false pou Render ka aksepte l san HTTPS konplèks nan kòd la
}));

// Middleware pou jere lang yo
app.use((req, res, next) => {
    if (!req.session.lang) {
        req.session.lang = 'fr';
    }
    res.locals.lang = req.session.lang;
    res.locals.user = req.session.user || null;
    next();
});

// Konfigirasyon sovgad Fichye yo (Multer)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'pdf') {
            cb(null, dirPdfs);
        } else {
            cb(null, dirCovers);
        }
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Fonksyon pou li ak ekri JSON
const getBooks = () => {
    const filePath = path.join(dirData, 'livres.json');
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([]));
    try {
        return JSON.parse(fs.readFileSync(filePath));
    } catch (e) {
        return [];
    }
};
const saveBooks = (books) => fs.writeFileSync(path.join(dirData, 'livres.json'), JSON.stringify(books, null, 2));

// ================= ROUTES =================

app.get('/lang/:lang', (req, res) => {
    if (['fr', 'kr'].includes(req.params.lang)) {
        req.session.lang = req.params.lang;
    }
    res.redirect('back');
});

app.get('/', (req, res) => {
    const books = getBooks();
    res.render('index', { books: books });
});

app.get('/admin/login', (req, res) => res.render('admin-login'));

app.post('/admin/login', (req, res) => {
    const { email, password } = req.body;
    if (email === 'lakouliv@gmail.com' && password === 'Admin2026!') {
        req.session.user = { id: 'admin', email: email, role: 'admin' };
        return res.redirect('/admin/dashboard');
    }
    res.send("Enfòmasyon enkòrèk.");
});

app.get('/admin/dashboard', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/admin/login');
    const books = getBooks();
    res.render('admin-dashboard', { books: books });
});

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
        coverUrl: '/uploads/covers/' + req.files['cover'][0].filename,
        pdfFilename: req.files['pdf'][0].filename,
        published: true,
        rating: 5
    };
    
    books.push(newBook);
    saveBooks(books);
    res.redirect('/admin/dashboard');
});

app.listen(PORT, () => {
    console.log(`Sèvè a ap kouri sou pò ${PORT}`);
});
