const Payslip = require('../models/Payslip');

const norm = (p) => ({ ...p, id: p._id });

// GET /api/payslips  — ?employee_id=, ?department_id=
const getPayslips = async (req, res) => {
  try {
    const filter = {};
    if (req.query.employee_id)   filter.employee_id   = req.query.employee_id;
    if (req.query.department_id) filter.department_id = req.query.department_id;

    const slips = await Payslip.find(filter).sort({ year: -1, month: -1 }).lean();
    res.json(slips.map(norm));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/payslips  — dept head generates payslip
const createPayslip = async (req, res) => {
  try {
    const { employee_id, employee_name, department_id, month, year, basic_salary, allowances, deductions, generated_by } = req.body;
    if (!employee_id || !month || !year || !basic_salary) {
      return res.status(400).json({ message: 'employee_id, month, year, basic_salary are required' });
    }
    const net_salary = Number(basic_salary) + Number(allowances || 0) - Number(deductions || 0);
    const slip = await Payslip.create({
      employee_id, employee_name, department_id,
      month, year, basic_salary, allowances: allowances || 0,
      deductions: deductions || 0, net_salary, generated_by,
    });
    res.status(201).json(norm(slip.toObject()));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/payslips/:id
const deletePayslip = async (req, res) => {
  try {
    const slip = await Payslip.findByIdAndDelete(req.params.id);
    if (!slip) return res.status(404).json({ message: 'Payslip not found' });
    res.json({ message: 'Payslip deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getPayslips, createPayslip, deletePayslip };
