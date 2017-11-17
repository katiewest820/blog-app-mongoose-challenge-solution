const chai = require('chai');
const mocha = require('mocha');
const chaiHttp = require('chai-http');
const faker = require('Faker');
const mongoose = require('mongoose');

const should = chai.should();

const { app, runServer, closeServer } = require('../server');
const { BlogPost } = require('../models');
const { TEST_DATABASE_URL } = require('../config');


chai.use(chaiHttp);

function seedBlogData() {
    console.log('seeding blog app data');
    const seedData = [];

    for (let i = 0; i < 10; i++) {
        seedData.push(generateBlogSeedData())
    }

    return BlogPost.insertMany(seedData);
}

function generateBlogSeedData() {
    return {
        content: faker.Lorem.sentences(),
        title: faker.Lorem.words(),
        author: {
            firstName: faker.Name.firstName(),
            lastName: faker.Name.lastName()
        }
    }
}

function tearDownDb() {
    console.log('deleting database');
    return mongoose.connection.db.dropDatabase();
}

describe('Blog API resources', function() {

    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function() {
        return seedBlogData();
    });


    afterEach(function() {
        return tearDownDb();
    });


    after(function() {
        return closeServer();
    });

    function getRandomNum(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    describe('GET endpoint', function() {

        it('should return all blog posts in DB', function() {
            let res;
            return chai.request(app)

                .get('/posts')
                .then(function(_res) {
                    res = _res;
                    res.should.have.status(200);

                    res.body.length.should.be.above(1)
                    return BlogPost.count();
                })
                .then(function(count) {
                    res.body.should.have.lengthOf(count);
                });
        });

        it('should return one blog post from DB', function() {
            return chai.request(app)
                .get('/posts')
                .then(function(res) {
                    let myId = res.body[getRandomNum(0, 9)].id
                    let myBlog;
                    return chai.request(app)
                        .get(`/posts/${myId}`)
                    myBlog = res.body
                        .then(function(res) {

                            res.should.have.status(200);
                            res.should.be.json;
                            res.body.should.include.keys(
                                'content', 'title', 'author')
                        })
                        .then(function(res) {
                            res.body.content.should.equal(myBlog.content);
                            res.body.title.should.equal(myBlog.title);
                            res.body.author.should.equal(myBlog.author);
                        })
                });
        });

    });

    describe('POST endpoint', function() {
        it('should post new blog entry to DB', function() {

            let newBlogPost = {
                title: 'new blog post test',
                content: 'hello world thank god its friday',
                author: {
                    firstName: 'Izzy',
                    lastName: 'West'
                }
            };

            return chai.request(app)
                .post('/posts')
                .send(newBlogPost)
                .then(function(res) {
                    res.should.have.status(201)

                    let authorName = newBlogPost.author.firstName + " " + newBlogPost.author.lastName

                    res.body.title.should.equal(newBlogPost.title);
                    res.body.content.should.equal(newBlogPost.content);
                    res.body.author.should.equal(authorName);
                });
        });
    });

    describe('PUT endpoint', function() {
        it('should change blog post with updated fields', function() {
            let updateInfo = {
                id: 0,
                title: 'Updated title',
                author: {
                    firstName: 'Katie',
                    lastName: 'West'
                }
            };
            return BlogPost
                .findOne()
                .then(function(blogPost) {
                    updateInfo.id = blogPost.id

                    return chai.request(app)
                        .put(`/posts/${updateInfo.id}`)
                        .send(updateInfo)
                        .then(function(res) {
                            res.should.have.status(204);


                            return BlogPost.findById(updateInfo.id)

                        })
                        .then(function(blogPost) {
                            blogPost.title.should.equal(updateInfo.title);
                            blogPost.author.firstName.should.equal(updateInfo.author.firstName);
                            blogPost.author.lastName.should.equal(updateInfo.author.lastName);
                        });
                })
        })
    });

    describe('DELETE endpoint', function() {
        it('should delete blog with selected ID from database', function() {
            return chai.request(app)
                .get('/posts')
                .then(function(res) {
                    let deletedItem = res.body[getRandomNum(0, 9)];
                    let myId = deletedItem.id;
                    return chai.request(app)
                        .delete(`/posts/${myId}`)
                        .then(function(res) {
                            res.should.have.status(204);
                            should.not.exist(res.deletedItem);
                        });
                });
        });
    });
}); 