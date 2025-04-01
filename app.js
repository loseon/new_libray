const express=  require('express')
const app= express()
const cors= require('cors')
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const path = require('path');

const multer = require('multer');
app.use(cors())
app.use(express.static('__dirname'))
app.use(bodyParser.json());

app.get('/',(req,res)=>{
    res.sendFile(__dirname+'/public/index.html')
})
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// 数据库连接
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "123456",
    database: "bookup"
});
// 检查数据库连接
db.connect(err => {
    if (err) {
        console.error("数据库连接失败:", err);
        process.exit();
    }
    console.log("数据库连接成功");
});
// 用户登录 API
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    const query = "SELECT * FROM users WHERE username = ? AND password = ?";
    db.query(query, [username, password], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: "服务器错误" });
        }
        if (results.length > 0) {
            return res.json({ success: true, message: "登录成功" });
        } else {
            return res.json({ success: false, message: "用户名或密码错误" });
        }
    });
});

// 用户注册 API
app.post("/register", (req, res) => {
    const { username, password } = req.body;

    const checkQuery = "SELECT * FROM users WHERE username = ?";
    db.query(checkQuery, [username], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: "服务器错误" });
        }
        if (results.length > 0) {
            return res.json({ success: false, message: "用户名已存在" });
        }

        const insertQuery = "INSERT INTO users (username, password) VALUES (?, ?)";
        db.query(insertQuery, [username, password], err => {
            if (err) {
                return res.status(500).json({ success: false, message: "注册失败" });
            }
            res.json({ success: true, message: "注册成功" });
        });
    });
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const fileExtension = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});

const upload = multer({ storage: storage });

// 解析请求的 JSON 数据
app.use(express.json());

// 处理 POST 请求，上传书籍和图片
app.post('/api/books', upload.single('image'), (req, res) => {
    const { title, author, isbn, owner } = req.body;
    let imageUrl = null;

    // 如果上传了图片，则使用图片的 URL
    if (req.file) {
        imageUrl = '/uploads/' + req.file.filename;
    }

    const sql = 'INSERT INTO books (title, author, isbn, owner, image) VALUES (?, ?, ?, ?, ?)';
    const values = [title, author, isbn, owner, imageUrl];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: '数据库插入失败' });
        }
        res.status(201).json({ message: '书籍添加成功' });
    });
});

// 获取所有书籍
app.get('/api/books', (req, res) => {
    const sql = 'SELECT * FROM books';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: '数据库查询失败' });
        }
        res.status(200).json(results);
    });
});


app.get('/dashboard',(req,res)=>{
    res.sendFile(__dirname+'/public/hall.html')
})

app.get('/jiehuan.html',(req,res)=>{
    res.sendFile(__dirname+'/public/jiehuan.html')
})

app.get('/view.html',(req,res)=>{
    res.sendFile(__dirname+'/public/view.html')
})

app.get('/addbook.html',(req,res)=>{
    res.sendFile(__dirname+'/public/addbook.html')
})

// const router=require('./api.Router')
// app.use('/dashboard/api',router)
// 启动服务器

app.post('/api/books', (req, res) => {
    // 从请求体中解构出四个属性：title（书名）、author（作者）、isbn（ISBN 编号）和 owner（拥有者）
    const { title, author, isbn, owner } = req.body;
    // 确保传入数据合法
    if (!title || !author || !isbn || !owner) {
        return res.status(400).send('Missing required fields');
    }
     // 构造一个 SQL 查询，用来将书籍信息插入到数据库的 books 表中
    const query = 'INSERT INTO books (title, author, isbn, owner) VALUES (?, ?, ?, ?)';

    db.query(query, [title, author, isbn, owner], (err, result) => {
        if (err) {
            console.error('Error inserting book:', err);
            return res.status(500).send('Error inserting book');
        }
        res.status(201).json({ message: 'Book added successfully' });
    });
});

// 获取所有书籍
app.get('/api/books', (req, res) => {
    const query = 'SELECT * FROM books'; // 查询所有书籍
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching books:', err);
            return res.status(500).send('Error fetching books');
        }
        res.json(results); // 返回所有书籍信息
    });
});

app.delete('/api/books/:id', (req, res) => {
    const bookId = req.params.id;

    // 使用已创建的 db 执行 SQL
    const sql = 'DELETE FROM books WHERE id = ?';
    db.query(sql, [bookId], (err, results) => {
        if (err) {
            console.error('删除失败:', err);
            return res.status(500).json({ message: '删除失败', error: err });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ message: '未找到书籍' });
        }

        res.status(200).json({ message: '书籍已删除' });
    });
});

app.post('/api/books/:id/borrow', (req, res) => {
    const bookId = req.params.id;
    const { borrower } = req.body;

    if (!borrower) {
        return res.status(400).json({ message: '借阅者姓名不能为空' });
    }
    const sql = 'UPDATE books SET is_borrowed = ?, borrower = ? WHERE id = ? AND is_borrowed = false';
    db.query(sql, [true, borrower, bookId], (err, results) => {
        if (err) {
            console.error('借阅失败:', err);
            return res.status(500).json({ message: '借阅失败' });
        }
        if (results.affectedRows === 0) {
            return res.status(400).json({ message: '该书籍已被借出' });
        }

        res.json({ message: '书籍借阅成功' });
    });
});
// 归还书籍
app.post('/api/books/:id/return', (req, res) => {
    const bookId = req.params.id;

    const sql = 'UPDATE books SET is_borrowed = false, borrower = NULL WHERE id = ? AND is_borrowed = true';
    db.query(sql, [bookId], (err, results) => {
        if (err) {
            console.error('归还失败:', err);
            return res.status(500).json({ message: '归还失败' });
        }

        if (results.affectedRows === 0) {
            return res.status(400).json({ message: '该书籍尚未借出' });
        }

        res.json({ message: '书籍归还成功' });
    });
});


app.listen(3000,()=>{
    console.log('server is running at http://127.0.0.1:3000')
})