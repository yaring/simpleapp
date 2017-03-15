/* The API controller
   Exports 3 methods:
   * create - Creates a new thread
   * list - Returns a list of threads
   * show - Displays a thread and its posts
*/
 
const Promise = require('bluebird');
const _ = require('lodash');
const co = Promise.coroutine;

var Thread = require('../models/thread.js');
var Post = require('../models/post.js');

exports.create = function(req, res) {
    new Thread({title: req.body.title, author: req.body.author}).save();
    res.send({ok: true})
};
 
exports.list = function(req, res) {
  Thread.find(function(err, threads) {
    res.send(threads);
  });
};
 
// first locates a thread by title, then locates the replies by thread ID.
exports.show = (function(req, res) {
    Thread.findOne({title: req.params.title}, function(error, thread) {
        var posts = Post.find({thread: thread._id}, function(error, posts) {
          res.send([{thread: thread, posts: posts}]);
        });
    })
});

exports.first = function (req, res) {
    return co(function * firstCo() {
        try {
            const allPosts = [];
            const threads = yield Thread.find().lean().exec();
            for (let thread of threads) {
                let posts = yield Post.find({thread: thread._id}).lean().exec();
                allPosts.push(posts)
            }

            const posts = _.flatten(allPosts);
            const threadsHash = _.keyBy(threads, '_id');
            const result = {};
            _.sortBy(posts, 'date').forEach(post => {
                let score = post.post == 'Winner' ? 1 : -1;
                result[threadsHash[post.thread].author] = result[threadsHash[post.thread].author] + score || 0;
            });

            res.send(result);
        } catch(e) {
            console.log(e);
        }

    })();
};

exports.second = function (req, res) {
    return co(function * firstCo() {
        try {
            const threads = yield Thread.find().lean().exec();
            const threadIds = _.map(threads, '_id');
            let posts = yield Post.find({thread: {$in: threadIds}}).lean().exec();

            const threadsHash = _.keyBy(threads, '_id');
            const result = {};
            _.sortBy(posts, 'date').forEach(post => {
                let score = post.post == 'Winner' ? 1 : -1;
                result[threadsHash[post.thread].author] = result[threadsHash[post.thread].author] + score || 0;
            });
            res.send(result);
        } catch(e) {
            console.log(e);
        }

    })();
};

exports.seedUp = function(req, res) {
    // Create threads
    const threadAuthors = ['Messi', 'Ronaldo'];
    const postAuthors = ['Batman', 'Spiderman', 'Ironman', 'Deadpool'];
    const postOptions = ['Winner', 'Loser'];
    const promises = [];
    _.times(100, (i) => {
        promises.push(new Thread({title: `Thread ${i}`, author: _.sample(threadAuthors)}).save());
    });

    Promise.all(promises)
        .then(threads => {
            threads.forEach(thread => {
                _.times(30, (i) => {
                    new Post({thread: thread.id, author: _.sample(postAuthors), post: _.sample(postOptions)}).save();
                });

            })
        });

    res.send({ok: true});
};

exports.seedDown = function(req, res) {
    Thread.collection.remove( function (err) {
        if (err) throw err;
        // collection is now empty but not deleted

        Post.collection.remove( function (err) {
            if (err) throw err;
        });
    });
    res.send({ok: true});
};
