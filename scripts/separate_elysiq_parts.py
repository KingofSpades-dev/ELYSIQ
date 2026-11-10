import bpy
import os
import mathutils

def separate_and_name_glb(input_path, output_path):
    # Clear existing objects in the scene to avoid conflicts
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    # Import GLB file
    print(f"Importing GLB from: {input_path}")
    bpy.ops.import_scene.gltf(filepath=input_path)
    
    # Filter imported meshes
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    if not meshes:
        print("No meshes found in the imported GLB!")
        return
    
    # Grab the main mesh (Tripo generates one single unified mesh)
    main_mesh = meshes[0]
    bpy.context.view_layer.objects.active = main_mesh
    main_mesh.select_set(True)
    
    # Enter Edit Mode and separate by loose parts
    print("Separating mesh by loose parts...")
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.separate(type='LOOSE')
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Retrieve all separated meshes
    parts = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    print(f"Found {len(parts)} separated parts.")
    
    if len(parts) <= 1:
        print("Mesh could not be separated. It might be physically connected in the file.")
        return
        
    # Analyze bounding boxes and volumes to identify each part
    analyzed_parts = []
    for part in parts:
        # Get absolute coordinates of bounding box
        bbox = [part.matrix_world @ mathutils.Vector(corner) for corner in part.bound_box]
        min_x = min(v.x for v in bbox)
        max_x = max(v.x for v in bbox)
        min_y = min(v.y for v in bbox)
        max_y = max(v.y for v in bbox)
        min_z = min(v.z for v in bbox)
        max_z = max(v.z for v in bbox)
        
        center_x = (min_x + max_x) / 2
        center_y = (min_y + max_y) / 2
        center_z = (min_z + max_z) / 2
        
        dim_x = max_x - min_x
        dim_y = max_y - min_y
        dim_z = max_z - min_z
        volume = dim_x * dim_y * dim_z
        
        analyzed_parts.append({
            'obj': part,
            'center': (center_x, center_y, center_z),
            'volume': volume,
            'dims': (dim_x, dim_y, dim_z),
            'min_z': min_z,
            'max_z': max_z
        })
        
    # 1. Body: Sort by volume (the body voxel is the largest structure)
    analyzed_parts.sort(key=lambda p: p['volume'], reverse=True)
    body_part = analyzed_parts[0]
    body_part['obj'].name = "Body"
    print(f"Identified 'Body': {body_part['obj'].name}")
    
    # 2. Base/Pedestal: Sort remaining by lowest Z position
    remaining_parts = analyzed_parts[1:]
    remaining_parts.sort(key=lambda p: p['min_z'])
    base_part = remaining_parts[0]
    base_part['obj'].name = "Base"
    print(f"Identified 'Base': {base_part['obj'].name}")
    
    # 3. Mustache and Eyes: Classify from remaining parts
    remaining_parts = remaining_parts[1:]
    for part in remaining_parts:
        center = part['center']
        dims = part['dims']
        
        # Mustache is wider (dims[0] > dims[2]) and positioned front-center
        if dims[0] > 0.35 and center[1] > body_part['center'][1] - 0.2:
            part['obj'].name = "Mustache"
            print(f"Identified 'Mustache': {part['obj'].name}")
        # Eye Left (negative X relative to center body)
        elif center[0] < body_part['center'][0] - 0.02:
            part['obj'].name = "Eye_L"
            print(f"Identified 'Eye_L': {part['obj'].name}")
        # Eye Right (positive X relative to center body)
        elif center[0] > body_part['center'][0] + 0.02:
            part['obj'].name = "Eye_R"
            print(f"Identified 'Eye_R': {part['obj'].name}")
        else:
            part['obj'].name = f"Part_{part['obj'].name}"
            
    # Export back to GLB
    print(f"Exporting separated GLB to: {output_path}")
    bpy.ops.export_scene.gltf(
        filepath=output_path, 
        export_format='GLB',
        export_colors=True,
        export_materials='EXPORT'
    )
    print("Process finished successfully!")

if __name__ == "__main__":
    # Absolute paths (modify if you run it elsewhere)
    input_file = r"d:\Real Kerja\ELYSIQ\public\models\elysiq.glb"
    output_file = r"d:\Real Kerja\ELYSIQ\public\models\elysiq_separated.glb"
    
    if os.path.exists(input_file):
        separate_and_name_glb(input_file, output_file)
    else:
        print(f"Input file not found at: {input_file}")
