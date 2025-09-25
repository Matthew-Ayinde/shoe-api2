const multer = require("multer")
const { CloudinaryStorage } = require("multer-storage-cloudinary")
const cloudinary = require("../config/cloudinary")

// Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "shoe-store",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1000, height: 1000, crop: "limit", quality: "auto" }],
  },
})

// File filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true)
  } else {
    cb(new Error("Only image files are allowed"), false)
  }
}

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
})

module.exports = upload
