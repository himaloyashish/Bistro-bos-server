const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const port  = process.env.PORT || 5000
require('dotenv').config()


app.use(cors())
app.use(express.json())


const jwtVerify = (req, res, next)=>{
  const authorized = req.headers.authorization
  if(!authorized){
     return res.status(401).send({error:true, message:'unAuthorized access'})
  }

  const token = authorized.split(' ')[1]

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded)=>{
    if(error){
      return  res.status(401).send({error:true, message:'unAuthorized access'})

    }
    req.decoded= decoded 
    console.log(decoded.email)

    next()

  })



}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6ogtg9l.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const menuCollection = client.db('BistroDB').collection('menu')
    const usersCollection = client.db('BistroDB').collection('users')
    const reviewCollection = client.db('BistroDB').collection('reviews')
    const cartCollection = client.db('BistroDB').collection('carts')

    app.post('/jwt', (req, res)=>{
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:'1h'
      })

      res.send({token})
    })

    // security same
    // check admin
    // user admin
    app.get('/users/admin/:email', jwtVerify, async(req, res)=>{
      const email = req.params.email
      const query = {email:email}
      if(req.decoded.email !== email){
        res.send({admin :false})
      }
      const user = await usersCollection.findOne(query)
      const result = {admin : user?.role === 'admin'}
      res.send(result)
    })


    // user get api
    app.get('/users', async(req, res)=>{
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    // user collection api

    app.post('/users', async(req, res)=>{
      const user = req.body
      const query = {email: user.email}
      const existing = await usersCollection.findOne(query)
      if(existing){
        return res.send({message:'user already exist'})
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)

    })

    // user update

    app.patch('/users/admin/:id', async(req,res)=>{
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set:{
          role:'admin'
        },
      }

      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)

    })


    // menu collection

    app.get('/menu', async(req, res)=>{
        const result = await menuCollection.find().toArray()
        res.send(result)
    })

    // reviews collection

    app.get('/reviews', async(req,res)=>{
        const result = await reviewCollection.find().toArray()
        res.send(result)
    })

    // cart collection

    app.get('/carts', jwtVerify, async(req, res)=>{
      const email = req.query.email
      if(!email){
        res.send([])
      }

      const decodedEmail = req.decoded.email
      if(email !==decodedEmail){
        return res.status(403).send({error:true, message:'access forbidden'})
      }
      const query = {email:email}
      const result = await cartCollection.find(query).toArray()
      res.send(result)

    })

    app.post('/carts', async(req,res)=>{
      const item = req.body
      const result = await cartCollection.insertOne(item)
      res.send(result)
    })

    app.delete('/carts/:id', async(req, res)=>{
      const id  = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await cartCollection.deleteOne(query)
      res.send(result)
    })
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res)=>{
    res.send('Here is bistro boss ready to prepare a meal for u')
})

app.listen(port, ()=>{
    console.log(`Bistro boss is ready on port ${port}`)
})
