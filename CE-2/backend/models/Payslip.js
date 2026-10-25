const mongoose = require('mongoose');
const { JsonCollection } = require('../config/jsonDb');

const payslipSchema = new mongoose.Schema(
  {
    employee_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employee_name: { type: String },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    month:         { type: Number, required: true },     // 1–12
    year:          { type: Number, required: true },
    basic_salary:  { type: Number, required: true },
    allowances:    { type: Number, default: 0 },
    deductions:    { type: Number, default: 0 },
    net_salary:    { type: Number },
    generated_by:  { type: String },
  },
  { timestamps: true }
);

const MongoPayModel = mongoose.models.Payslip || mongoose.model('Payslip', payslipSchema);
const jsonPay = new JsonCollection('payslips');

const PayProxy = new Proxy(MongoPayModel, {
  get(target, prop) {
    if (process.env.USE_JSON_DB === 'true') {
      if (typeof jsonPay[prop] === 'function') return jsonPay[prop].bind(jsonPay);
      return jsonPay[prop];
    }
    return target[prop];
  },
});

module.exports = PayProxy;
