import { put } from "@vercel/blob";
import mammoth from "mammoth";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: "File size should be less than 5MB",
    })
    // Update the file type based on the kind of files you want to accept
    .refine(
      (file) =>
        [
          "image/jpeg",
          "image/png",
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ].includes(file.type),
      {
        message: "File type should be JPEG, PNG, PDF, or Word document",
      }
    ),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get("file") as File).name;
    const fileBuffer = await file.arrayBuffer();

    // extractedText will be set when we parse .docx files; declare here for later response
    let extractedText: string | null = null;

    // If .docx, convert to PDF (mammoth -> pdf-lib) and upload the generated PDF
    const isDocx =
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      filename.toLowerCase().endsWith(".docx");

    if (isDocx) {
      try {
        // Extract raw text from docx
        const result = await mammoth.extractRawText({ buffer: Buffer.from(fileBuffer) });
        const extractedText = (result && result.value) || "";

        // Create a simple PDF from the extracted text
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 12;

        const pageWidth = 595.28; // A4 width in pts
        const pageHeight = 841.89; // A4 height in pts
        const margin = 50;
        const maxWidth = pageWidth - margin * 2;

        let page = pdfDoc.addPage([pageWidth, pageHeight]);
        let y = pageHeight - margin;

        const words = String(extractedText).split(/\s+/);
        let line = "";

        for (const word of words) {
          const testLine = line ? `${line} ${word}` : word;
          const testWidth = font.widthOfTextAtSize(testLine, fontSize);
          if (testWidth > maxWidth) {
            // draw current line
            page.drawText(line, { x: margin, y: y - fontSize, size: fontSize, font });
            y -= fontSize + 4;
            line = word;
            if (y < margin + fontSize) {
              page = pdfDoc.addPage([pageWidth, pageHeight]);
              y = pageHeight - margin;
            }
          } else {
            line = testLine;
          }
        }

        if (line) {
          page.drawText(line, { x: margin, y: y - fontSize, size: fontSize, font });
        }

        const pdfBytes = await pdfDoc.save();

        // Upload the generated PDF instead of the original .docx
        const pdfFilename = `${filename.replace(/\.docx$/i, "")}.pdf`;
        const pdfData = await put(pdfFilename, Buffer.from(pdfBytes), { access: "public" });

        // Return the PDF upload info to the client
        return NextResponse.json(
          {
            ...pdfData,
            pathname: pdfData?.pathname ?? pdfFilename,
            contentType: "application/pdf",
          },
        );
      } catch (err) {
        console.error("Failed to convert .docx to PDF:", err);
        // Fall back to uploading original file below
      }
    }

    try {
      const data = await put(`${filename}`, fileBuffer, {
        access: "public",
      });

      // Include any extracted text (if available) in the response
      return NextResponse.json({ ...data, extractedText });
    } catch (_error) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
