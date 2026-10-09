const careerService = require("../services/careerService");

const createCareer = async (req, res) => {
  try {
    const newCareer = await careerService.createCareer(req.body);
    
    return res.status(201).json({
      message: "Carrera creada correctamente",
      career: newCareer,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const getAllCareers = async (req, res) => {
  try {
    const careers = await careerService.getAllCareers();

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

    const career = await careerService.findCareerById(id);
  
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
    return res.status(400).json({
      message: error.message,
    });
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
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Error al eliminar la carrera",
    });
  }
};

module.exports = {
  createCareer,
  getAllCareers,
  getCareerById,
  updateCareer,
  deleteCareer,
};