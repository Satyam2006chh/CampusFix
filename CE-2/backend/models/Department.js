const mongoose = require('mongoose');
const { JsonCollection } = require('../config/jsonDb');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category_tag: {
      type: String,
      required: [true, 'Category tag is required'],
      lowercase: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const MongoDeptModel = mongoose.models.Department || mongoose.model('Department', departmentSchema);
const jsonDepts = new JsonCollection('departments');

const DeptProxy = new Proxy(MongoDeptModel, {
  get(target, prop) {
    if (process.env.USE_JSON_DB === 'true') {
      if (typeof jsonDepts[prop] === 'function') {
        return jsonDepts[prop].bind(jsonDepts);
      }
      return jsonDepts[prop];
    }
    return target[prop];
  },
});

module.exports = DeptProxy;
