const fs = require('fs');
const path = require('path');

// Path to db.json in database folder (local testing database)
const dbFilePath = path.join(__dirname, '..', 'data', 'db.json');

// Ensure data folder and db.json exist
function ensureDataFile() {
  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(dbFilePath)) {
    // Copy seed from CE-1 database if available
    const ce1Path = path.join(__dirname, '..', '..', '..', 'CE-1', 'database', 'db.json');
    if (fs.existsSync(ce1Path)) {
      fs.copyFileSync(ce1Path, dbFilePath);
    } else {
      fs.writeFileSync(
        dbFilePath,
        JSON.stringify({ users: [], departments: [], locations: [], complaints: [] }, null, 2),
        'utf-8'
      );
    }
  }
}

ensureDataFile();

function readData() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(dbFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return { users: [], departments: [], locations: [], complaints: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Generate unique ID
function nextId() {
  return String(Date.now().toString(36) + Math.random().toString(36).substr(2, 5));
}

// Helper wrapper providing Mongoose-like Query interface for collections
class JsonCollection {
  constructor(collectionName) {
    this.name = collectionName;
  }

  getAll() {
    const data = readData();
    return data[this.name] || [];
  }

  saveAll(items) {
    const data = readData();
    data[this.name] = items;
    writeData(data);
  }

  // Find multiple items
  find(query = {}) {
    let items = this.getAll();
    if (query && Object.keys(query).length > 0) {
      items = items.filter((item) => {
        return Object.entries(query).every(([k, v]) => {
          if (v === undefined || v === null) return true;
          // Exact or string equality
          return String(item[k] ?? '').toLowerCase() === String(v).toLowerCase();
        });
      });
    }

    // Query builder chaining
    return {
      _items: items,
      sort(sortObj = {}) {
        const [field, direction] = Object.entries(sortObj)[0] || [];
        if (field) {
          this._items.sort((a, b) => {
            const valA = a[field] || '';
            const valB = b[field] || '';
            if (valA < valB) return direction === -1 ? 1 : -1;
            if (valA > valB) return direction === -1 ? -1 : 1;
            return 0;
          });
        }
        return this;
      },
      populate(field) {
        if (field === 'department_id') {
          const depts = readData().departments || [];
          this._items = this._items.map((item) => {
            const dept = depts.find((d) => String(d.id) === String(item.department_id));
            return {
              ...item,
              department_id: dept || item.department_id,
            };
          });
        }
        return this;
      },
      lean() {
        return Promise.resolve(this._items.map((item) => ({ ...item, _id: item.id })));
      },
      then(resolve, reject) {
        return this.lean().then(resolve, reject);
      },
    };
  }

  // Find single item
  findOne(query = {}) {
    const items = this.getAll();
    const item = items.find((it) => {
      return Object.entries(query).every(([k, v]) => {
        if (v === undefined || v === null) return true;
        return String(it[k] ?? '').toLowerCase() === String(v).toLowerCase();
      });
    });

    const matchPassword = async function (enteredPassword) {
      // In JSON testing, compare directly or hash
      return enteredPassword === this.password;
    };

    const doc = item ? { ...item, _id: item.id, matchPassword } : null;

    return {
      select(fields) {
        return this;
      },
      populate(field) {
        if (doc && field === 'department_id') {
          const depts = readData().departments || [];
          const dept = depts.find((d) => String(d.id) === String(doc.department_id));
          doc.department_id = dept || doc.department_id;
        }
        return this;
      },
      then(resolve, reject) {
        return Promise.resolve(doc).then(resolve, reject);
      },
    };
  }

  findById(id) {
    const items = this.getAll();
    const item = items.find((it) => String(it.id) === String(id) || String(it._id) === String(id));
    const matchPassword = async function (enteredPassword) {
      return enteredPassword === this.password;
    };
    const doc = item ? { ...item, _id: item.id, matchPassword } : null;

    return {
      select(fields) {
        return this;
      },
      populate(field) {
        if (doc && field === 'department_id') {
          const depts = readData().departments || [];
          const dept = depts.find((d) => String(d.id) === String(doc.department_id));
          doc.department_id = dept || doc.department_id;
        }
        return this;
      },
      lean() {
        return Promise.resolve(doc);
      },
      then(resolve, reject) {
        return Promise.resolve(doc).then(resolve, reject);
      },
    };
  }

  // Create new document
  async create(data) {
    const items = this.getAll();
    const id = nextId();
    const newDoc = {
      ...data,
      id,
      _id: id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    items.push(newDoc);
    this.saveAll(items);

    return {
      ...newDoc,
      toObject: () => ({ ...newDoc }),
    };
  }

  // Find and update
  async findByIdAndUpdate(id, updates, options = {}) {
    const items = this.getAll();
    const index = items.findIndex((it) => String(it.id) === String(id) || String(it._id) === String(id));
    if (index === -1) return null;

    items[index] = {
      ...items[index],
      ...updates,
      _id: items[index].id,
      updatedAt: new Date().toISOString(),
    };
    this.saveAll(items);

    const updated = items[index];
    return {
      ...updated,
      lean: () => Promise.resolve(updated),
      then: (resolve, reject) => Promise.resolve(updated).then(resolve, reject),
    };
  }

  // Find one and update
  async findOneAndUpdate(query = {}, updates = {}, options = {}) {
    const items = this.getAll();
    const index = items.findIndex((it) => {
      return Object.entries(query).every(([k, v]) => {
        if (v === undefined || v === null) return true;
        return String(it[k] ?? '').toLowerCase() === String(v).toLowerCase();
      });
    });
    if (index === -1) return null;

    items[index] = {
      ...items[index],
      ...updates,
      _id: items[index].id,
      updatedAt: new Date().toISOString(),
    };
    this.saveAll(items);

    const updated = items[index];
    return {
      ...updated,
      lean: () => Promise.resolve(updated),
      then: (resolve, reject) => Promise.resolve(updated).then(resolve, reject),
    };
  }

  // Find and delete
  async findByIdAndDelete(id) {
    const items = this.getAll();
    const index = items.findIndex((it) => String(it.id) === String(id) || String(it._id) === String(id));
    if (index === -1) return null;

    const [deleted] = items.splice(index, 1);
    this.saveAll(items);
    return deleted;
  }
}

module.exports = {
  dbFilePath,
  JsonCollection,
};
