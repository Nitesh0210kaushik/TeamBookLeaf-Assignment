import { Schema, model } from "mongoose";

/** Atomic sequence generator (findOneAndUpdate + $inc) for human-readable ticket numbers. */
const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

export const CounterModel = model("Counter", counterSchema);

export const TICKET_NUMBER_START = 1000;

export async function nextSequence(name: string, start = TICKET_NUMBER_START) {
  // Idempotent initialisation, then an atomic increment.
  await CounterModel.updateOne({ _id: name }, { $setOnInsert: { seq: start } }, { upsert: true });
  const counter = await CounterModel.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { returnDocument: "after" },
  ).lean();

  return counter!.seq;
}
