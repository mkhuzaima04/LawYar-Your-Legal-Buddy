const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  id: { type: String },
  law: { type: String },
  chapter: { type: String, default: "" },
  section_number: { type: String },
  section_title: { type: String },
  text: { type: String },
  char_count: { type: Number },
  page_approx: { type: Number }
});

const lawSchema = new mongoose.Schema({
  law: { type: String, required: true, unique: true },
  processed_at: { type: Date },
  total_chunks: { type: Number },
  chunks: [chunkSchema] 
}, { timestamps: true });

module.exports = mongoose.model('Law', lawSchema);