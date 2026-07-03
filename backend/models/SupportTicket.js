import mongoose from 'mongoose';

let ticketCounter = 0;

const responseSchema = new mongoose.Schema(
  {
    responderType: { type: String, enum: ['restaurant', 'platform'], required: true },
    responderId:   { type: mongoose.Schema.Types.ObjectId },
    responderName: { type: String, required: true },
    content:       { type: String, required: true },
  },
  { timestamps: true }
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber:   { type: String, unique: true },
    restaurantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
    restaurantName: { type: String },

    subject:     { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    status: {
      type:    String,
      enum:    ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    priority: {
      type:    String,
      enum:    ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformAdmin', default: null },
    resolvedAt: { type: Date, default: null },

    responses: [responseSchema],
  },
  { timestamps: true }
);

supportTicketSchema.pre('save', async function () {
  if (!this.ticketNumber) {
    const count = await mongoose.model('SupportTicket').countDocuments();
    this.ticketNumber = `TKT-${String(count + 1).padStart(6, '0')}`;
  }
});

supportTicketSchema.index({ restaurantId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1,     createdAt: -1 });
supportTicketSchema.index({ assignedTo: 1, status:    1  });

export default mongoose.model('SupportTicket', supportTicketSchema);
