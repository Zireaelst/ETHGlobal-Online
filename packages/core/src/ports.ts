import type {
  GraphSnapshot,
  PaymentReceipt,
  SubmitRequest,
  WitnessResult,
} from "@blockterms/contracts";

export interface AdapterContext {
  orderId: string;
  signal: AbortSignal;
}

export interface GraphAdapter {
  fetch(request: SubmitRequest["query"], context: AdapterContext): Promise<GraphSnapshot[]>;
}

export interface WitnessAdapter {
  fetch(request: SubmitRequest["witness"], context: AdapterContext): Promise<WitnessResult>;
}

export interface PaymentAdapter {
  pay(request: SubmitRequest["policy"], context: AdapterContext): Promise<PaymentReceipt>;
}

export interface ExecutionAdapters {
  graph: GraphAdapter;
  witness: WitnessAdapter;
  payment: PaymentAdapter;
}

export interface AdapterSet {
  simulation: ExecutionAdapters;
  live?: ExecutionAdapters;
}
