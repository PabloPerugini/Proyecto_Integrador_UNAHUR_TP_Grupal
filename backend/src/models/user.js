const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    nickName: {
      type: String,
      required: [true, "NickName es obligatorio"],
      unique: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email es obligatorio"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "La contraseña es obligatoria"],
    },
    rol: {
      type: String,
      enum: ["USUARIO", "ADMIN"],
      default: "USUARIO",
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
  if (this.isModified("password") && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

userSchema.pre("findOneAndUpdate", async function () {
  const update = this.getUpdate();

  if (update && update.password) {
    const salt = await bcrypt.genSalt(10);
    update.password = await bcrypt.hash(update.password, salt);
  }
})

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;

  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
})

const User = mongoose.model("User", userSchema);

module.exports = User;