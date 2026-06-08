import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "A prompt describing the invoice is required." },
        { status: 400 }
      );
    }

    const systemInstruction = 
      "You are an expert financial billing analyst and structured information extractor. " +
      "Your task is to analyze plain English invoice descriptions and extract complete billing details. " +
      "Verify the names of customers, items, unit prices, quantities, taxes, and dates. " +
      "Format dates as YYYY-MM-DD. Calculate missing subtotals or infer percentages carefully. " +
      "If the input only specifies a lump sum price for an item, list that amount as the rate with quantity 1.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: {
              type: Type.STRING,
              description: "Full name of the customer.",
            },
            customerEmail: {
              type: Type.STRING,
              description: "Email address of the customer.",
            },
            companyName: {
              type: Type.STRING,
              description: "Customer's company or business name if mentioned.",
            },
            gstNumber: {
              type: Type.STRING,
              description: "GST or Tax registration number of user/customer if mentioned.",
            },
            invoiceNumber: {
              type: Type.STRING,
              description: "An invoice number if explicitly specified (e.g. INV-102).",
            },
            issueDate: {
              type: Type.STRING,
              description: "The issue date of the invoice in YYYY-MM-DD format.",
            },
            dueDate: {
              type: Type.STRING,
              description: "The due date of the invoice in YYYY-MM-DD format.",
            },
            items: {
              type: Type.ARRAY,
              description: "List of products, services, or line items with name, quantity, and rate.",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: {
                    type: Type.STRING,
                    description: "Product or service description name.",
                  },
                  quantity: {
                    type: Type.INTEGER,
                    description: "Quantity of the items. Default to 1 if not specified.",
                  },
                  rate: {
                    type: Type.NUMBER,
                    description: "Unit price or rate of the item.",
                  },
                },
                required: ["name", "quantity", "rate"]
              }
            },
            taxRate: {
              type: Type.NUMBER,
              description: "The GST or VAT tax rate percentage. Default to 18 if not specified.",
            },
            discountRate: {
              type: Type.NUMBER,
              description: "Trade or cash discount percentage. Default to 0.",
            },
            notes: {
              type: Type.STRING,
              description: "Any internal messages, terms, payment details, or additional remarks.",
            },
            status: {
              type: Type.STRING,
              description: "Determine the payment status. One of 'pending', 'paid', or 'draft'. Default to 'pending'.",
            }
          },
          required: ["customerName", "customerEmail", "items"]
        },
      },
    });

    const parsedJson = JSON.parse(response.text || "{}");
    return NextResponse.json(parsedJson);
  } catch (error: any) {
    console.error("Gemini AI Invoice Extraction Error: ", error);
    return NextResponse.json(
      { error: error?.message || "Failed to parse properties from description query." },
      { status: 500 }
    );
  }
}
