const mongoose = require("mongoose");

const acaActivitySchema = new mongoose.Schema(
  {
    userStudyPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserStudyPlan",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    category: {
      type: String,
      required: true,
      enum: ["UC", "EF", "INSTITUTO"],
    },
    credits: {
      type: Number,
      required: true,
      min: 0.01,
    },
    interactionHours: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true },
);

acaActivitySchema.index({ userStudyPlan: 1, createdAt: 1 });

module.exports = mongoose.model("AcaActivity", acaActivitySchema);
