const moongose = require("mongoose");
const University = require("./university");
const { default: mongoose } = require("mongoose");

const academicUnitSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "El nombre de la unidad académica es obligatorio"],
            trim: true,
        },

        type: {
            type: String,
            enum: [
                "FACULTAD",
                "INSTITUTO",
                "DEPARTAMENTO",
                "SEDE",
                "OTRO",
            ],
            required:true,
        },

        description: {
            type: String,
            trim: true,
        },
        university: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "University",
            required: true,
        },
        parentUnit: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AcademicUnit",
            default:null,
        },
    },
    {
        timestamps: true,
    }
);
const AcademicUnit = mongoose.model(
    "AcademicUnit",
    academicUnitSchema
);

module.exports = AcademicUnit;