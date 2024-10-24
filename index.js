const express = require("express")
const app = express()
const cors = require('cors')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { default: mongoose } = require("mongoose")
const User = require('./models/User')
const Post = require('./models/Post')
const multer = require('multer')
const uploadMiddleware = multer({ dest: 'uploads/' });
const dotenv = require("dotenv");

dotenv.config();

const fs = require('fs')
const cookieParser = require('cookie-parser')
app.use('/uploads', express.static(__dirname + '/uploads'));

// origin:'https://soft-gumption-4ae84e.netlify.app',
const corsOptions = {
    origin:'https://soft-gumption-4ae84e.netlify.app',
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE"};
    

app.use(cors({ credentials: true, corsOptions, origin:'http://localhost:3000'}))
app.use(express.json())
app.use(cookieParser())

// app.use('/uploads', express.static(__dirname + '/uploads'));
const salt = bcrypt.genSaltSync(10);
const secret = process.env.SECRET;
let dbConntection = process.env.DB_URL
console.log(dbConntection)
mongoose.connect(dbConntection).then(() =>{
    console.log("DB Connected")
}).catch((error) =>{
    console.log(error)
})

app.post('/register',  async(req,res) =>{
const {username, password} = req.body;
try {
    const userData = await  User.create({username, 
        password:bcrypt.hashSync(password, salt)


    })
    res.json(userData)
} catch (err) {
    console.log(err)
    res.status(400).json(err)
}

})

app.post('/login', async(req,res) =>{
   const {username, password} = req.body;
   
   const userDoc =  await User.findOne({username});
   const passOkdata =  bcrypt.compareSync(password, userDoc.password)
   
   if(passOkdata){
   jwt.sign({username,id:userDoc._id}, secret, {}, (err,token) => {
        if (err) throw err;
        res.cookie('token', token).json({
          id:userDoc._id,
          username,
        });
      });
   }else{
    res.status(400).json("wrong Credentials")
   }
  
})

app.get('/profile',(req,res) =>{
 const {token} = req.cookies;
 jwt.verify(token, secret, {}, (err, info) => {
  if(err) throw err
  res.json(info) 
 });

   
})
app.post('/logout',(req,res) =>{
    res.cookie('token','').json('OK')
})

app.post('/post', uploadMiddleware.single('file'), async(req,res) => {
    // console.log(req.body)
   
    const {originalname, path} = req.file
    const part = originalname.split('.');
    const ext = part[part.length-1]
    const newPath = path+'.'+ext
    fs.renameSync(path, newPath );
   

 const {token} = req.cookies;
 jwt.verify(token, secret, {}, async(err, info) => {
  if(err) throw err
  const {title, summery, content} = req.body
 const postDoc = await  Post.create({
     title,
     summery,
     content,
     cover: newPath,
     author:info.id,
    })
    res.json(postDoc)

    
})
 })
 

app.get('/post',async(req, res) =>{

    res.json(await Post.find()
    .populate('author',['username']))
    
})
app.get('/post/:id',async(req,res) =>{
    const {id} = req.params
 
const onePost =  await Post.findById(id).populate('author',['username'])
res.json(onePost)
})

app.put('/post', uploadMiddleware.single('file'), async(req,res) => {
    let newPath = null
    if(req.file){
        const {originalname, path} = req.file
        const part = originalname.split('.');
        const ext = part[part.length-1]
         newPath = path+'.'+ext
        fs.renameSync(path, newPath );
    }
    
    const {token} = req.cookies
    jwt.verify(token, secret, {}, async(err, info) => {
        if(err) throw err
        const {title, summery, content, id} = req.body
        const postDoc = await Post.findById(id)
        console.log(postDoc)
        const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id)
         if(!isAuthor){
            return res.status(400).json('you are not the author')
         }
          await postDoc.updateOne({
            title,
            summery,
            content,
            cover: newPath ? newPath : postDoc.cover,
          });
      
          res.json(postDoc)
    })


})

app.listen(4000) 
//
//