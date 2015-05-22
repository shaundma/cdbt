<?php

namespace CustomDataBaseTables\Lib;

trait CdbtExtras {

  /**
   * Filter to attribute of class in the body tag of rendered page
   *
   * @since v2.0.0
   *
   * @param mixed $classes It is `String` when "is_admin()" is true; otherwise is `Array`
   * @return mixed $classes
   */
  public function add_body_classes( $classes ) {
    if (is_array($classes)) {
      $classes[] = 'fuelux';
      return $classes;
    } else {
      $classes_array = explode(' ', $classes);
      $classes_array[] = 'fuelux';
      return implode(' ', $classes_array);
    }
  }
  // CdbtFrontend : add_filter( 'body_class', array($this, 'add_body_classes') );


  /**
   * Condition of features during trial
   *
   * @since v2.0.0
   *
   * @param string $feature_name
   * @return void
   */
  function during_trial( $feature_name ) {
    $new_features = [
      'enable_core_tables', 
      'debug_mode', 
      'default_charset', 
      'localize_timezone', 
      'default_db_engine', 
      'default_per_records', 
    ];
    if (in_array($feature_name, $new_features)) {
      printf( '<span class="label label-warning">%s</span>', __('Trialling', CDBT) );
    }
  }

  /**
   * Create datasource of table list for repeater of fuelux
   *
   * @since v2.0.0
   *
   * @param array $data Array of table name
   * @param 
   * @return array $datasource Array for repeater of fuelux
   */
  public function create_datasorce( $data ) {
    $datasource = [];
    if (is_array($data)) {
      asort($data);
      
      $index = 0;
      $is_assoc = $this->is_assoc($data);
      foreach ($data as $key => $value) {
        $index++;
        $current_data = $this->array_flatten($this->get_data($value, 'count(*)', 'ARRAY_N'));
        $datasource[] = [
          'cdbt_index_id' => $is_assoc ? $index : $key, 
          'table_name' => $value, 
          'logical_name' => $is_assoc ? $key : $value, 
          'records' => $current_data[0], 
          'info' => null, 
          'table_controls' => null, 
          'import' => null, 
          'export' => null, 
          'duplicate' => null, 
          'modify' => null, 
          'drop' => null, 
          'data_controls' => null, 
          'truncate' => null, 
          'view' => null, 
          'entry' => null, 
          'edit' => null, 
          'thumbnail_src' => $this->plugin_url . $this->plugin_assets_dir . '/images/database-table.png', // optional
          'thumbnail_title' => $value, // optional
          'thumbnail_bgcolor' => 'tranceparent', // optional
          'thumbnail_width' => 64, // optional
          'thumbnail_height' => 64, // optional
          'thumbnail_class' => null, // optional
        ];
        
      }
    }
    
    return $datasource;
  }
  
  
  /**
   * Create scheme of datasource for repeater of fuelux
   *
   * @since v2.0.0
   *
   * @param array $data Array of table name
   * @param 
   * @return array $datasource Array for repeater of fuelux
   */


}