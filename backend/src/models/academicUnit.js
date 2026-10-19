const mongoose = require("mongoose");
const University = require("./university");

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

        // Color institucional (hex #rrggbb) editable por el ADMIN.
        // Si es null se usa el color oficial por nombre en el frontend.
        color: {
            type: String,
            default: null,
            validate: {
                validator: (value) =>
                    value === null ||
                    value === undefined ||
                    /^#[0-9a-fA-F]{6}$/.test(value),
                message: "El color debe ser un hex #rrggbb",
            },
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
academicUnitSchema.index({ name: 1, university: 1 }, { unique: true });
const AcademicUnit = mongoose.model(
    "AcademicUnit",
    academicUnitSchema
);

module.exports = AcademicUnit;