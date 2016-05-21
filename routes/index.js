var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Bobblehead Generator' });
});

/*test*/

module.exports = router;

// Requcired Dependencies
var fs = require('fs');
var path = require('path');
var oxford = require('project-oxford');
var Jimp = require('jimp');
var pngFileStream = require('png-file-stream');
var GIFEncoder = require('gifencoder');
var age;
var gender;


//一発目のアクセス時のファイル削除処理
// var dirname = './public/images'
// console.log(dirname);
// var RemoveFiles = fs.readdirSync(dirname);
// console.log(RemoveFiles);
// console.log(RemoveFiles.length);
// for (var i = 0; i < RemoveFiles.length; i++) {
//   fs.unlink(path.join(dirname, RemoveFiles[i]));
//   console.log("successfully deleted :", path.join(dirname, RemoveFiles[i]));
// }

// Handle POST request
router.post('/', function (req, res, next) {
    var imgSrc = req.file ? req.file.path : '';
    Promise.resolve(imgSrc)
        .then(function detectFace(image) {
          console.log("TODO: detect face using Oxford API.");
          var client = new oxford.Client(process.env.OXFORD_API);
          return client.face.detect({
              path: image,
              returnFaceId: true,
              analyzesFaceLandmarks: true,
              analyzesAge: true,
              analyzesGender: true,
              analyzesHeadPose: true,
              analyzesSmile: true,
              analyzesFacialHair: true,
              // analyzeGlasses: true
          });
        })
        .then(function generateBobblePermutations (response) {
            var promises = [];
            var degrees = [10, 0, -10];
            
            console.log("TODO: generate multiple images with head rotated.");
            
            // debug
            age = response[0].faceAttributes.age;
            gender = response[0].faceAttributes.gender;
            console.log(age);
            console.log(gender);
            console.log('The Landmarks is:' + response[0].faceAttributes.faceLandmarks);
            console.log('The age is: ' + response[0].faceAttributes.age);
            console.log('The gender is: ' + response[0].faceAttributes.gender);
            console.log('The headpose is: ' + response[0].faceAttributes.headPose);
            console.log('The FaceID is: ' + response[0].faceAttributes.faceID);
            console.log('The Smile is: ' + response[0].faceAttributes.smile);
            console.log('The FacialHair is: ' + response[0].faceAttributes.facialHair);
            // console.log('The Glasses is: ' + response[0].faceAttributes.glasses);
            // 
            for (var i = 0; i < degrees.length; i++) {
              var outputName = req.file.path + '-' + i + '.png';
              promises.push(cropHeadAndPasteRotated(req.file.path,response[0].faceRectangle, degrees[i], outputName))
            }
          return Promise.all(promises);
        })
        .then(function generateGif (dimensions) {
          return new Promise(function (resolve, reject) {
          var encoder = new GIFEncoder(dimensions[0][0], dimensions[0][1]);
          pngFileStream(req.file.path + '-?.png')
            .pipe(encoder.createWriteStream({ repeat: 0, delay: 500 }))
            .pipe(fs.createWriteStream(req.file.path + '.gif'))
            .on('finish', function () {
                resolve(req.file.path + '.gif');
            });
          })
        }).then(function displayGif(gifLocation) {
            res.render('index', { mes1: 'だいたい', mes2: '歳だと思う', mes3:'だと思う', age: age, gender: gender, title: 'Done!', image: gifLocation });
        }).then(function() {
          // 5 秒後にファイルを削除
          setTimeout(function(){
            //作成されたファイルを削除処理
            // var dirname = path.dirname(req.file.path);
            // console.log(dirname);
            // var RemoveFiles = fs.readdirSync(path.dirname(req.file.path));
            // console.log(RemoveFiles);
            // console.log(RemoveFiles.length);
            // for (var i = 0; i < RemoveFiles.length; i++) {
            //   fs.unlink(path.join(dirname, RemoveFiles[i]));
            //   console.log("successfully deleted :", path.join(dirname, RemoveFiles[i]));
            // }
          },5000);
        });
});

function cropHeadAndPasteRotated(inputFile, faceRectangle, degrees, outputName) {
    return new Promise (function (resolve, reject) {
        Jimp.read(inputFile).then(function (image) {
            // Face detection only captures a small portion of the face,
            // so compensate for this by expanding the area appropriately.
            var height = faceRectangle['height'];
            var top = faceRectangle['top'] - height * 0.5;
            height *= 1.6;
            var left = faceRectangle['left'];
            var width = faceRectangle['width'];
            // Crop head, scale up slightly, rotate, and paste on original image
            image.crop(left, top, width, height)
            .scale(1.05)
            .rotate(degrees, function(err, rotated) {
                Jimp.read(inputFile).then(function (original) {
                    original.composite(rotated, left-0.1*width, top-0.05*height)
                    .write(outputName, function () {
                        resolve([original.bitmap.width, original.bitmap.height]);
                    });
                });
            });
        });
    });
}