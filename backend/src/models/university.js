const mongoose = require("mongoose");

const universitySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "El nombre de la universidad es obligatorio"],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

const University = mongoose.model("University", universitySchema);

module.exports = University;