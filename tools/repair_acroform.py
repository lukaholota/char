import sys
from pypdf import PdfReader, PdfWriter

def main():
    infile = sys.argv[1] if len(sys.argv) > 1 else "CharacterSheet.pdf"
    outfile = sys.argv[2] if len(sys.argv) > 2 else "CharacterSheet_fixed.pdf"

    reader = PdfReader(infile)
    writer = PdfWriter()

    # Важливо: append, щоб не поламати структуру форми при копіюванні
    writer.append(reader)
    writer.reattach_fields()

    with open(outfile, "wb") as f:
        writer.write(f)

if __name__ == "__main__":
    main()
