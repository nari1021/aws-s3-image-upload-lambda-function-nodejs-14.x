const AWS = require('aws-sdk');
const multipart = require("parse-multipart");
const s3 = new AWS.S3();
const bluebird = require('bluebird');
const uuid = require('uuid');
const today = new Date().toISOString();

exports.handler = function (event, context) {
    let result = [];
    const bodyBuffer = new Buffer(event['body-json'].toString(), 'base64');
    const boundary = multipart.getBoundary(event.params.header['Content-Type']);
    const parts = multipart.Parse(bodyBuffer, boundary);

    // getFiles 함수로 이미지를 가져옴.
    let files = getFiles(parts);

    return bluebird.map(files, file => {
        return upload(file).then(
            data => {
                result.push({
                    // data: ETag, Location, Bucket, Key 값이 들어있음
                    data,
                    // date: 업로드한 시간
                    'date': today,
                    // fileName: 파일 이름
                    'fileName': file.uploadFile.name
                });
                console.log(`data=> ${JSON.stringify(data, null, 2)}`);
            },
            err => {
                console.log(`s3 upload err => ${err}`);
            }
        );
    })
        .then(_ => {
            return context.succeed(result);
        });
};

let upload = function (file) {
    // 실제로 s3에 업로드하는 메서드
    return s3.upload(file.params).promise();
};

// 첨부한 파일 가져오는 함수
let getFiles = function (parts) {
    let files = [];
    parts.forEach(part => {
        let buffer = part.data;

        /** !!!!!!!!!!!!!!!!!!!!!!!!!! 버킷 이름 수정 !!!!!!!!!!!!!!!!!!!!!!!!! */
        let bucketName = 'plz_rename_bucket';

        // 파일이름을 uuid.v4 버전으로 이름을 바꿔줌.
        const fileName = `${uuid.v4()}.jpg`;
        const filefullPath = bucketName + fileName;

        // S3 정보를 담은 파라미터
        let params = {
            Bucket: bucketName,
            Key: fileName,
            Body: buffer
        };

        // 업로드하는 파일에 대한 정보
        let uploadFile = {
            size: buffer.toString('ascii').length,
            type: part.type,
            name: fileName,
            full_path: filefullPath
        };

        files.push({ params, uploadFile });
    });
    return files;
}
