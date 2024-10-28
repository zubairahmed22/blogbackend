const express = require("express")
const app = express()
const cors = require('cors')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { default: mongoose } = require("mongoose")
const User = require('./models/User')
const Post = require('./models/Post')
const multer = require('multer')

const dotenv = require("dotenv");
const uploadMiddleware = multer({ dest: '/tmp' });

dotenv.config();
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3')


const fs = require('fs')
const cookieParser = require('cookie-parser')


// origin:'https://soft-gumption-4ae84e.netlify.app',

    

app.use(cors({
    origin: ["https://blogpost-frontend-eight.vercel.app"], // the link of my front-end app on Netlify
    methods: ["GET", "POST"],
    credentials: true}))
app.use(express.json())
app.use(cookieParser())


// app.use('/uploads', express.static(__dirname + '/uploads'));
const salt = bcrypt.genSaltSync(10);
const secret = process.env.SECRET;
let dbConntection = process.env.DB_URL
const bucket = "blogpost-web-app"

mongoose.connect(dbConntection).then(() =>{
    console.log("DB Connected")
}).catch((error) =>{
    console.log(error)
})


async function uploadToS3(path, originalFilename, mimemtype ) {
    const client = new S3Client({
        region: 'us-cast-1',
        credentials:{
          accessKeyId: process.env.S3_ACCESS_KEY,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY 
        } 
    })
    const part = originalFilename.split('.');
    const ext = part[part.length-1]
    const newFilename = path+'.'+ext
  const data =  await client.send(new PutObjectCommand({
        Bucket: bucket,
        body: fs.readFileSync(path),
        Key: newFilename ,
        ContentType: mimemtype,
        ACL: 'public-read'
    }))
   
    console.log(data)
}


app.post('/api/register',  async(req,res) =>{
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

app.post('/api/login', async(req,res) =>{
   const {username, password} = req.body;
   
   const userDoc =  await User.findOne({username});
   const passOkdata =  bcrypt.compareSync(password, userDoc.password)
   
   if(passOkdata){
   jwt.sign({username,id:userDoc._id}, secret, {}, (err,token) => {
        console.log(token)
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

app.get('/api/profile',(req,res) =>{
 const {token} = req.cookies;
 jwt.verify(token, secret, {}, (err, info) => {
  if(err) throw err
  res.json(info) 
 });

   
})
app.post('/api/logout',(req,res) =>{
    res.cookie('token','').json('OK')
})

app.post('/api/post',  uploadMiddleware.single('file'), async(req,res) => {
    // console.log(req.body)
   
    const {originalname, path, mimemtype} = req.file
     
   

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
 

app.get('/api/post',async(req, res) =>{

    res.json(await Post.find()
    .populate('author',['username']))
    
})
app.get('/api/post/:id',async(req,res) =>{
    const {id} = req.params
 
const onePost =  await Post.findById(id).populate('author',['username'])
res.json(onePost)
})

app.put('/api/post', uploadMiddleware.single('file'), async(req,res) => {
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

app.listen(process.env.PORT) 
//
//
