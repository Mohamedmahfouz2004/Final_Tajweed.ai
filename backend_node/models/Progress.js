const mongoose = require('mongoose');

const mistakeSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
    error_type: { type: String, required: true },           // e.g., 'madd', 'ghunna', 'qalqala'
    rule_category: { type: String, default: '' },            // e.g., 'المدود', 'أحكام النون الساكنة'
    rule_name_ar: { type: String, default: '' },             // e.g., 'المد', 'الغنة'
    surah_number: { type: Number },
    ayah_number: { type: Number },
    ayah_text: { type: String },
    char_index: { type: Number },
    is_corrected: { type: Boolean, default: false },
    corrected_at: { type: Date },
    feedback: { type: String },
    audio_url: { type: String },
    occurrence_count: { type: Number, default: 1 }
}, { timestamps: true });

const progressSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    status: {
        type: String,
        enum: ['not-started', 'in-progress', 'completed'],
        default: 'not-started'
    },
    score: { type: Number, default: 0 },
    last_accessed: { type: Date, default: Date.now }
}, { timestamps: true });

progressSchema.index({ user: 1, lesson: 1 }, { unique: true });

const Progress = mongoose.model('Progress', progressSchema);
const Mistake = mongoose.model('Mistake', mistakeSchema);

module.exports = { Progress, Mistake };
