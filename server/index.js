const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 9000
const app = express()

app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.z1ypfcb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

// verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access!" });
  }
  jwt.verify(token, process.env.privateKey, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized Access!" });
    }
    req.user = decoded;
  })
  next();
}

async function run() {
  try {
    const database = client.db("solosphere");
    const jobsCollection = database.collection("jobs");
    const bidsCollection = database.collection("bids");

    // generate token
    app.post('/jwt', async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.privateKey, { expiresIn: "365d" });
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
      })
        .send({ success: true });
    })

    // logout || clear token for browser
    app.post('/logout', async (req, res) => {
      res.clearCookie('token', {
        maxAge: 0,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
      })
        .send({ success: true });
    })

    // get all jobs data form bd
    app.get("/all-jobs", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const skip = (page - 1) * size;
      
      const filter = req.query.filter;
      const search = req.query.search;
      const sort = req.query.sort;
      // set sort option
      let sortOption = {};
      if (sort) {
        sortOption = { sort: { deadline: sort === "asc" ? 1 : -1 } };
      }
      // set query option
      let query = { title: { $regex: search, $options: 'i' } };
      if (filter) {
        query.category = filter;
      }
      const result = await jobsCollection.find(query, sortOption).skip(skip).limit(size).toArray();
      res.send(result);
    })

    // get all jobs home tabs 
    app.get("/jobs", async (req, res) => {
      const categories = ["Web Development", "Graphics Design", "Digital Marketing"];
      const result = [];

      for(const category of categories){
        const items = await jobsCollection.find({category}).limit(8).toArray();
        result.push(...items);
      }
      res.send(result);
    })

    // jobs count for pagination
    app.get("/jobs-count", async (req, res) => {
      const count = await jobsCollection.countDocuments();
      res.send({ count });
    })

    // get email jobs posted data
    app.get("/jobs/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { "buyer.email": email };
      const decodedEmail = req.user?.email;

      if (decodedEmail !== email) {
        return res.status(403).send({ message: 'Forbidden Access!' });
      }
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    })

    // get a single job data by id form bd
    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query)
      res.send(result);
    })

    // save a job data in bd
    app.post("/add-job", async (req, res) => {
      const job = req.body;
      const result = await jobsCollection.insertOne(job);
      res.send(result);
    })

    // save a bid data in bd
    app.post("/add-bid", async (req, res) => {
      const bidData = req.body;
      // validation: user already bib
      const query = { email: bidData.email, jobId: bidData.jobId }
      const alreadyExist = await bidsCollection.findOne(query);
      if (alreadyExist) {
        return res.status(400).send("User already bid on this job!")
      }
      //1. save data in bid collection
      const result = bidsCollection.insertOne(bidData);
      //2. increase bid count in jobs collection
      const filter = { _id: new ObjectId(bidData.jobId) };
      const update = {
        $inc: { bid_count: 1 },
      };
      const updateBidCount = await jobsCollection.updateOne(filter, update);
      res.send(result);
    })

    // get user all bids
    app.get("/bids/:email", verifyToken, async (req, res) => {
      const isBuyer = req.query.buyer;
      const email = req.params.email;
      const decodedEmail = req.user?.email;

      if (decodedEmail !== email) {
        return res.status(403).send({ message: 'Forbidden Access!' });
      }

      let query = {};
      if (isBuyer) {
        query.buyer = email;
      } else {
        query.email = email;
      }

      const result = await bidsCollection.find(query).toArray();
      res.send(result);
    })

    //  job data updated in bd
    app.put("/update-job/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const jobData = req.body;
      const updated = {
        $set: jobData,
      };
      const option = { upsert: true };
      const result = await jobsCollection.updateOne(filter, updated, option);
      res.send(result);
    })

    // bid status update
    app.patch("/bid-status-update:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateStatus = {
        $set: { status },
      }
      const result = await bidsCollection.updateOne(filter, updateStatus);

      // If status is "In Progress", reject all other bids for the same job
      // if (status === "In Progress") {
      //   const currentBid = await bidsCollection.findOne(filter);
      //   if (currentBid && currentBid.jobId) {
      //     await bidsCollection.updateMany(
      //       {
      //         jobId: currentBid.jobId,
      //         _id: { $ne: new ObjectId(id) }
      //       },
      //       { $set: { status: "Rejected" } }
      //     );
      //   }
      // }

      res.send(result);
    })

    // database data delete
    app.delete("/job/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    })
    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)
app.get('/', (req, res) => {
  res.send('Hello from SoloSphere Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))
