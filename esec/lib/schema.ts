import { z } from 'zod';

export const PartSchema = z.object({
  partId: z.string(),
  name: z.string(),
  partNumber: z.string(),
  category: z.enum([
    'bracket', 'standoff', 'enclosure', 'heat-sink',
    'pcb-mount', 'fastener', 'sheet-metal', 'connector',
    'spacer', 'clip'
  ]),
  material: z.string(),
  functionalDescription: z.string(),
  dimensions: z.object({
    length: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    unit: z.enum(['mm', 'in']),
  }).optional(),
  weight: z.number().optional(),
  costEstimate: z.number().optional(),
});

export const AssemblySchema = z.object({
  assemblyId: z.string(),
  name: z.string(),
  version: z.string(),
  status: z.enum(['draft', 'review', 'released', 'deprecated']),
  description: z.string(),
});

export const DesignDocSchema = z.object({
  docId: z.string(),
  title: z.string(),
  docType: z.enum(['dfm-note', 'spec', 'rfq', 'eco', 'tolerance-report', 'vendor-feedback']),
  content: z.string(),
  source: z.string(),
});

export const QACSchema = z.object({
  qacId: z.string(),
  question: z.string(),
  answer: z.string(),
  action: z.string(),
  status: z.enum(['open', 'answered', 'resolved', 'reused']),
  timestamp: z.string(),
  tags: z.array(z.string()).optional(),
});

export const WorkflowSchema = z.object({
  workflowId: z.string(),
  name: z.string(),
  description: z.string(),
  stepCount: z.number(),
  category: z.string(),
});

export const WorkflowStepSchema = z.object({
  stepId: z.string(),
  order: z.number(),
  action: z.string(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  description: z.string(),
});

export const EngineerSchema = z.object({
  engineerId: z.string(),
  name: z.string(),
  role: z.enum(['senior-me', 'junior-me', 'cad-designer', 'manufacturing-eng', 'student']),
  expertise: z.array(z.string()),
});

export const VendorSchema = z.object({
  vendorId: z.string(),
  name: z.string(),
  capabilities: z.array(z.string()),
  leadTimeDays: z.number(),
  location: z.string(),
});

export const ConstraintSchema = z.object({
  constraintId: z.string(),
  type: z.enum(['tolerance', 'material', 'process', 'cost', 'thermal', 'weight']),
  value: z.string(),
  description: z.string(),
});

export const SkillSchema = z.object({
  skillId: z.string(),
  name: z.string(),
  description: z.string(),
  inputSchema: z.string(),
  outputSchema: z.string(),
});
