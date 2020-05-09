#!/usr/bin/env node
const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');
const Schema = mongoose.Schema;
const express = require('express');
var cors = require('cors');
const bodyParser = require('body-parser');
const logger = require('morgan');
const bcrypt = require("bcrypt");
const { toJWT } = require("./auth/jwt");

const API_PORT = 3001;
const app = express();
app.use(cors());
const router = express.Router();

const dbRoute = 'mongodb://zouachang:MiguC123@13.75.73.57:27017/user';
mongoose.connect(dbRoute, { useNewUrlParser: true });
autoIncrement.initialize(mongoose.connection);
var userSchema = new Schema({
    firstName: String,
    lastName: String,
    email: String,
    password: String
},
    { timestamps: true });

userSchema.plugin(autoIncrement.plugin, { model: 'User', startAt: 1 });
let User = mongoose.connection.model('User', userSchema);

var videoSchema = new Schema({
    userId: String,
    participant: String,
    videoTitle: String,
    contactInfo: String,
    nationality: String,
    synopsis: String,
    videoUrl: String,
},
    { timestamps: true });

let Video = mongoose.connection.model('Video', videoSchema);

let db = mongoose.connection;

db.once('open', () => console.log('connected to the database'));

db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(logger('dev'));

router.post('/user/signup', (req, res) => {
    let user = new User();
    const { firstName, lastName, email, password } = req.body;
    if (!email || !password || !firstName || !lastName) {
        return res.status(400).send("Missing input data.");
    }
    const hashedPassword = bcrypt.hashSync(password, 10);

    user.firstName = firstName;
    user.lastName = lastName;
    user.email = email;
    user.password = hashedPassword;
    User.find({ email: user.email }, (err, u) => {
        if (err) return res.status(400).send("Sign up failed, please try again.");
        if (u && u.length) return res.status(400).send("Email duplicated");
        user.save((err) => {
            if (err) return res.status(400).send("Sign up failed, please try again.");
            return res.status(200).send("Sign up successed!");
        });
    });
});

router.post("/user/login", async (req, res) => {
    try {
        User.findOne({
            email: req.body.email
        }, function (err, user) {
            if (err) return res.status(400).send("Log in failed, please try again.");
            if (user && user.password) {
                const passwordValid = bcrypt.compareSync(req.body.password, user.password);
                if (passwordValid) {
                    const userNew = {
                        id: user._id,
                        email: user.email,
                        token: toJWT({ id: user.id })
                    };
                    return res.send(userNew);
                } else {
                    return res.status(400).send("Incorrect password");
                }
            } else {
                return res.status(400).send("Account not existed");
            }
        });
    } catch (error) {
        res.status(500).send("Something went wrong");
    }
});

router.post('/video/upload', (req, res) => {
    let video = new Video();
    const { userId, participant, videoTitle, contactInfo, nationality, synopsis, videoUrl } = req.body;
    if (!userId || !participant || !videoTitle || !contactInfo || !nationality || !synopsis || !videoUrl) {
        return res.status(400).send("Missing input data.");
    }

    video.userId = userId;
    video.participant = participant;
    video.videoTitle = videoTitle;
    video.contactInfo = contactInfo;
    video.nationality = nationality;
    video.synopsis = synopsis;
    video.videoUrl = videoUrl;
    video.save((err) => {
        if (err) return res.status(400).send("Upload failed, please try again.");
        return res.status(200).send("Upload successed!");
    });
});

router.get('/:userId/video/list', (req, res) => {
    const userId = parseInt(req.params.userId);
    console.log(userId);
    Video.find({userId: userId}, 'videoTitle synopsis createdAt', { sort: { 'createdAt': 1 } }, (err, video) => {
        if (err) return res.status(400).send("Get uploaded videos failed, please try again.");
        return res.status(200).json({ success: true, video: video});
    });
});

app.use('/api', router);

app.listen(API_PORT, () => console.log(`LISTENING ON PORT ${API_PORT}`));