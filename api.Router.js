const express = require('express')
const router = express.Router()

router.use(express.static(__dirname+'/public'))


router.get('/jiehuan.html',(req,res)=>{
    res.sendFile(__dirname+'/jiehuan.html')
})

router.get('/viewBooks.html',(req,res)=>{
    res.sendFile(__dirname+'/viewBooks.html')
})

router.get('/addBook.html',(req,res)=>{
    res.sendFile(__dirname+'/addBook.html')
})



module.exports = router