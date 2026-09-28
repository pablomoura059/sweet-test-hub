import { z } from "zod";

const approvedPurchaseSchema = z.object({
  secret: z.string().min(1),
  event: z.literal("purchase_approved"),
  data: z.object({
    id: z.string().min(1),
    refId: z.string().min(1),
    customer: z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().min(1),
      docNumber: z.string().optional(),
      birthDate: z.string().nullable().optional(),
    }),
  }),
});

const webhookEnvelopeSchema = z.object({
  secret: z.string().min(1),
  event: z.string().min(1),
  data: z.unknown(),
});

export type ApprovedPurchase = z.infer<typeof approvedPurchaseSchema>;

export function parseWebhookEnvelope(payload: unknown) {
  return webhookEnvelopeSchema.safeParse(payload);
}

export function parseApprovedPurchase(payload: unknown) {
  return approvedPurchaseSchema.safeParse(payload);
}

export function secretsMatch(received: string, expected: string) {
  const encoder = new TextEncoder();
  const receivedBytes = encoder.encode(received);
  const expectedBytes = encoder.encode(expected);

  if (receivedBytes.length !== expectedBytes.length) return false;

  let difference = 0;
  for (let index = 0; index < receivedBytes.length; index += 1) {
    const receivedByte = receivedBytes.at(index);
    const expectedByte = expectedBytes.at(index);
    if (receivedByte === undefined || expectedByte === undefined) return false;
    difference |= receivedByte ^ expectedByte;
  }

  return difference === 0;
}