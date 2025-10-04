#!/usr/bin/env python3

import os
import re
import sys


def modify_keymap_file(keymap_file_path):
    """Modify the keymap file to add &trans bindings for the new buttons and update physical layout"""
    
    with open(keymap_file_path, 'r') as f:
        content = f.read()
    
    # First, update the physical layout reference
    content = re.sub(
        r'chosen\s*{\s*zmk,physical-layout\s*=\s*&?foostan_corne_5col_layout\s*;\s*}',
        'chosen { zmk,physical-layout = &default_layout; }',
        content
    )
    
    # Find only the keymap section and its layer definitions
    keymap_start_pattern = r'keymap\s*{\s*compatible\s*=\s*"[^"]*";\s*'
    keymap_section_pattern = r'(keymap\s*{\s*compatible\s*=\s*"[^"]*";\s*)(.*?)(\s*};\s*(?:\s*conditional_layers|$))'
    
    def modify_keymap_section(match):
        keymap_start = match.group(1)
        keymap_content = match.group(2)
        keymap_end = match.group(3)
        
        # Pattern to match layer definitions within keymap
        layer_pattern = r'(\w+\s*{\s*(?:display-name\s*=\s*"[^"]*";\s*)?bindings\s*=\s*<)(.*?)(>\s*;\s*(?:\s*label\s*=\s*"[^"]*";\s*)?})'
        
        def add_trans_to_layer(layer_match):
            layer_start = layer_match.group(1)
            bindings_content = layer_match.group(2)
            layer_end = layer_match.group(3)
            
            # Split bindings into lines
            lines = bindings_content.strip().split('\n')
            
            # Process each line to add &trans at appropriate positions
            modified_lines = []
            row_count = 0
            
            for line in lines:
                stripped_line = line.strip()
                
                # Skip empty lines and lines that don't contain bindings
                if not stripped_line or stripped_line.startswith('//'):
                    modified_lines.append(line)
                    continue
                
                # Check if this is a binding line (contains & symbols)
                if '&' in stripped_line:
                    # Count rows - we only want to modify first two rows
                    row_count += 1
                    
                    if row_count <= 2:  # Only modify first two rows
                        # Add 2 &trans at the end of the line (after the existing bindings)
                        indentation = line[:len(line) - len(line.lstrip())]
                        new_line = indentation + stripped_line + '  &trans  &trans'
                        modified_lines.append(new_line)
                    else:
                        # Keep other rows unchanged
                        modified_lines.append(line)
                else:
                    modified_lines.append(line)
            
            return layer_start + '\n'.join(modified_lines) + layer_end
        
        # Apply the transformation to all layers in keymap section
        modified_keymap_content = re.sub(layer_pattern, add_trans_to_layer, keymap_content, flags=re.DOTALL | re.MULTILINE)
        
        return keymap_start + modified_keymap_content + keymap_end
    
    # Apply the transformation only to keymap section
    modified_content = re.sub(keymap_section_pattern, modify_keymap_section, content, flags=re.DOTALL | re.MULTILINE)
    
    # Write back to file
    with open(keymap_file_path, 'w') as f:
        f.write(modified_content)
    
    print(f"Successfully modified {keymap_file_path}")
    print("✓ Updated physical layout reference to &default_layout")
    print("✓ Added 2 &trans bindings to the end of first two rows of all layers")

def main():
    keymap_file = 'config/corne_choc_pro.keymap'
    
    # Check if file exists
    if not os.path.exists(keymap_file):
        print(f"❌ Error: {keymap_file} not found!")
        print("Make sure you're running this script from the zmk-config root directory.")
        sys.exit(1)
    
    print("Expanding keyboard layout from 36 to 40 keys...")
    print("This will:")
    print("  • Add 2 &trans bindings to the end of row 0 and row 1 in all layers")
    print("  • Update physical layout reference to &default_layout")
    print()
    
    try:
        # Modify keymap bindings only
        modify_keymap_file(keymap_file)
        
        print()
        print("✅ Successfully completed layout expansion!")
        print()
        print("The keyboard layout now supports 40 keys instead of 36.")
        print("You can now customize the new &trans positions with your desired bindings.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
