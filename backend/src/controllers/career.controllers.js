const mongoose = require("mongoose");
const careerService = require("../services/careerService");

// Traduce errores del servicio a respuestas seguras: solo se expone el
// mensaje de errores de dominio marcados con `expose`; el resto es genérico.
const respondCareerError = (res, error, fallback) => {
  if (error?.code === 11000) {
    return res.status(409).json({
      message: "Ya existe una carrera con esos datos",
    });
  }

  if (error?.expose && error.statusCode) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ message: "Datos inválidos" });
  }

  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: "ID inválido" });
  }

  console.error(error);

  return res.status(500).json({ message: fallback });
};

const createCareer = async (req, res) => {
  try {
    const newCareer = await careerService.createCareer(req.body);
    
    return res.status(201).json({
      message: "Carrera creada correctamente",
      career: newCareer,
    });
  } catch (error) {
    return respondCareerError(res, error, "No se pudo crear la carrera");
  }
};

const getAllCareers = async (req, res) => {
  try {
    // includeArchived solo para ADMIN (con auth opcional, sin romper público).
    const includeArchived =
      req.query.includeArchived === "1" && req.user?.rol === "ADMIN";

    const careers = await careerService.getAllCareers({
      unit: req.query.unit,
      includeArchived,
    });

    return res.status(200).json(careers);
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener las carreras",
    });
  }
};

const getCareerById = async (req, res) => {
  try {
    const {id} = req.params;

    const includeArchived =
      req.query.includeArchived === "1" && req.user?.rol === "ADMIN";

    const career = await careerService.findCareerById(id, {
      includeArchived,
    });
  
    if (!career) {
      return res.status(404).json({
        message: "Carrera no encontrada",
      });
    }

    return res.status(200).json(career);
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener la carrera",
    });
  }
};

const updateCareer = async (req, res)=> {
  try {
    const {id} = req.params;

    const updatedCareer = await careerService.updateCareer(
      id,
      req.body
    );

    if (!updatedCareer) {
      return res.status(404).json({
        message: "Carrera no encontrada",
      });
    }

    return res.status(200).json({
      message: "Carrera actualizada correctamente",
      career: updatedCareer,
    });
  } catch (error) {
    return respondCareerError(res, error, "No se pudo actualizar la carrera");
  }
}

const deleteCareer = async (req, res) => {
  try {
    const {id} = req.params;

    const deletedCareer = await careerService.deleteCareer(id);

    if (!deletedCareer) {
      return res.status(404).json({
        message: "Carrera no encontrada",
      });
    }

    return res.status(200).json({
      message: "Carrera eliminada correctamente",
    });
  } catch (error) {
    return respondCareerError(res, error, "Error al eliminar la carrera");
  }
};

module.exports = {
  createCareer,
  getAllCareers,
  getCareerById,
  updateCareer,
  deleteCareer,
};