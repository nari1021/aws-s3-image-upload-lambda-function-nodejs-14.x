const sharp = require("sharp");
const aws = require("aws-sdk");
const s3 = new aws.S3();

/** !!!!!!!!!!!!!!!!!!!!!!!!!! 버킷 이름 수정 !!!!!!!!!!!!!!!!!!!!!!!!! */
const Bucket = "plz_rename_bucket";
const transforms = [
    { name: "w_500", width: 500 },
];

exports.handler = async (event, context, callback) => {
    const key = event.Records[0].s3.object.key;
    const sanitizedKey = key.replace(/\+/g, " ");
    const parts = sanitizedKey.split("/");
    const filename = parts[parts.length - 1];

    try {
        const image = await s3.getObject({ Bucket, Key: sanitizedKey }).promise();

        await Promise.all(
            transforms.map(async item => {
                const resizedImg = await sharp(image.Body)
                    .resize({ width: item.width })
                    .toBuffer();
                return await s3
                    .putObject({
                        Bucket,
                        Body: resizedImg,
                        Key: `images/${item.name}/${filename}`
                    })
                    .promise();
            })
        );
        callback(null, `Success: ${filename}`);
    } catch (err) {
        callback(`Error resizing files: ${err}`);
    }
};

/* 참고 문서
 * https://mygumi.tistory.com/349 [마이구미의 HelloWorld]
 */