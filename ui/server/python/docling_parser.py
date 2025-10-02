#!/usr/bin/env python3
"""
Docling Parser for VIZTRTR
Parses PDF, DOCX, PPTX, HTML and other documents into structured markdown
"""

import sys
import json
from pathlib import Path
from docling.document_converter import DocumentConverter

def parse_document(file_path: str) -> dict:
    """
    Parse a document using Docling

    Args:
        file_path: Path to the document file

    Returns:
        dict with keys:
            - markdown: Full markdown content
            - tables: List of extracted tables
            - metadata: Document metadata
            - success: Boolean success status
            - error: Error message if failed
    """
    try:
        # Initialize converter
        converter = DocumentConverter()

        # Convert document
        result = converter.convert(file_path)

        # Extract markdown
        markdown = result.document.export_to_markdown()

        # Extract tables (if any)
        tables = []
        for table in result.document.tables:
            # Call the method to get markdown string
            table_markdown = table.export_to_markdown(result.document) if hasattr(table.export_to_markdown, '__call__') else str(table)
            tables.append({
                'data': table_markdown,
                'num_rows': getattr(table, 'num_rows', None),
                'num_cols': getattr(table, 'num_cols', None)
            })

        # Get metadata - ensure all values are JSON serializable
        num_pages = getattr(result.document, 'num_pages', None)
        # If num_pages is a method, call it
        if callable(num_pages):
            num_pages = None

        metadata = {
            'num_pages': num_pages,
            'file_type': str(Path(file_path).suffix),
            'file_name': str(Path(file_path).name)
        }

        return {
            'success': True,
            'markdown': str(markdown),
            'tables': tables,
            'metadata': metadata
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'markdown': None,
            'tables': [],
            'metadata': {}
        }

if __name__ == '__main__':
    # Read file path from stdin or argv
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        # Read from stdin (for python-shell compatibility)
        file_path = sys.stdin.readline().strip()

    if not file_path:
        print(json.dumps({
            'success': False,
            'error': 'No file path provided'
        }))
        sys.exit(1)

    # Parse document
    result = parse_document(file_path)

    # Output JSON result
    print(json.dumps(result, ensure_ascii=False, indent=2))
