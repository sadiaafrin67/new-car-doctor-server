const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookiePerser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    // 'http://localhost:5173'
   'https://cars-doctor-3d632.web.app',
   'https://cars-doctor-3d632.firebaseapp.com'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookiePerser());


// DB_USER=docUser
// DB_PASS=zF6DbgVGjqv4cx98
// ACCESS_TOKEN_SECRET=e30c0a141a463f242ec054d73d436f25165be8b5830a85a7bc737ebec4ce1a3872648c719c65e1e2c074bc068d1375ea21b07d158b7d1d9b66e08c975dd89687


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mnum3sy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



// middleware my own
// module 60
// const logger = async( req, res, next ) => {
//   console.log('called:', req.host, req.originalUrl)
//   next()
// }

// const verifyToken = async (req, res, next) => {
//   const token = req.cookies?.token;
//   console.log('value of token in middle ware', token)
//   if(!token) {
//     return res.status(401).send({message: 'not authorized'})
//   }
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//     // error
//     if(err) {
//       console.log('error', err)
//       return res.status(401).send({message:'unauthorized'})
//     }

//     // if token is valid then it would be decoded
//     console.log('value in the token', decoded)
//     req.user = decoded
//     next()
//   })
  
// }
 
const logger = (req, res, next) => {
  console.log('log: info', req.method, req.url)
  next()
}
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log('token in the middleware', token)
  // no token available
  if(!token){
    return res.status(401).send({message: 'unauthorized access'})
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({message: 'unauthorized access'})
    }
    req.user = decoded;
    next();
  })

}







async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    const serviceCollection = client.db('carDoctor').collection('services');
    const bookingCollection = client.db('carDoctor').collection('bookings');


    // auth related api
    // module 60
    // app.post('/jwt', logger, async (req, res) => {
    //     const user = req.body;
    //     console.log(user)
    //     const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
    //     res
    //     .cookie('token', token, {
    //       httpOnly: true,
    //       secure: false,
    //     })
    //     .send({success: true})
    // })

    app.post('/jwt', logger, async (req, res) => {
        const user = req.body;
        console.log('user for token', user)
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
        
        res
        .cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        })
        .send({success: true})
    })

    // for logout (auth related)
    app.post('/logout', async (req, res) => {
        const user = req.body;
        console.log('logging out', user)
        res
        .clearCookie('token', {maxAge: 0})
        .send({success: true})
    })


    // services related api
    app.get('/services', logger, async (req, res) => {
        const cursor = serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    app.get('/services/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };

        
    const options = {
        
        // Include only the `title` and `imdb` fields in the returned document
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };


        const result = await serviceCollection.findOne(query, options);
        res.send(result);
    })



    // bookings related api
    app.get('/bookings', logger, verifyToken, async (req, res) => {
        console.log(req.query.email)
        // console.log('cookies in bookings', req.cookies)
        console.log('token owner info', req.user)
        if(req.user?.email !== req.query.email){
          return res.status(403).send({message: 'forbidden access'})
        }
        let query = {};
        if (req.query?.email) {
            query = {email: req.query.email}
        }
        const result = await bookingCollection.find(query).toArray();
        res.send(result);
    })
  


    app.post('/bookings', async (req, res) => {
        const booking = req.body
        console.log(booking)
        const result = await bookingCollection.insertOne(booking);
        res.send(result)
    })


    app.patch('/bookings/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
       
        const updatedBooking = req.body
        console.log(updatedBooking)
        const updateDoc = {
            $set: {
              status: updatedBooking.status
            }
        }
        const result = await bookingCollection.updateOne(filter, updateDoc);
        res.send(result)
    })

    


    app.delete('/bookings/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await bookingCollection.deleteOne(query);
        res.send(result);
    })

  


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('Car-Dr. is running')
})
app.listen(port, () => {
    console.log(`Car-Dr. is running on port: ${port}`)
})