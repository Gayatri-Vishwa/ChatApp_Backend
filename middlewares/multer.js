import multer from 'multer'

 const multerUpload=multer({
    limits:{
        fileSize:1024 * 1024*100
        // fileSize:1024 * 1024*5
    }
})

const singleAvatar=multerUpload.single("avatar")
// const attachmentsMulter =multerUpload.single("files",5)  //max file 5
const attachmentsMulter = multerUpload.array("files", 5);

export {singleAvatar, attachmentsMulter}