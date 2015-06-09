<?php

namespace CustomDataBaseTables\Lib;


/**
 * Trait of shortcode difinitions for this plugin 
 *
 * @since 2.0.0
 *
 */
trait CdbtShortcodes {
  
  private $shortcodes;
  
  /**
   * 
   *
   * @since 2.0.0
   **/
  protected function shortcode_register() {
    
    $this->shortcodes = [
      'cdbt-view'     => 'view_data_list', 
      'cdbt-entry'    => 'entry_data_form', 
      'cdbt-edit'      => 'editable_data_list', 
      'cdbt-extract'  => 'view_data_list', // Deprecated from v2.0.0; It has been merged into `cdbt-view`
      'cdbt-submit'  => 'submit_custom_query', // Deprecated from v2.0.0
    ];
    foreach ($this->shortcodes as $shortcode_name => $method_name) {
      if (method_exists($this, $method_name)) 
        add_shortcode( $shortcode_name, array($this, $method_name) );
    }
    
  }
  
  
  /**
   * 
   *
   * @since 2.0.0
   *
   * @param string $table_name [require]
   * @return 
   **/
  
  
  
  
  /**
   * Retrieve a table data that match the specified conditions, then it outputs as list
   *
   * @since 1.0.0
   * @since 2.0.0 Have refactored logic.
   *
   * @param array $attributes [require] Array of attributes in shortcode
   * @param string $content [optional] For default is empty
   * @return string $html_content The formatted content as list
   **/
  public function view_data_list() {
    list($attributes, $content) = func_get_args();
    extract( shortcode_atts([
      'table' => '', // Required attribute
      'bootstrap_style' => true, // If false is output by the static table tag layout in non the Repeater format. Also does not have any pagination when false.
      'display_list_num' => false, // The default value has changed to false from v2.0.0
      'display_search' => true, // Is enabled only if "bootstrap_style" is true.
      'display_title' => true, 
      'enable_sort' => true, //  Is enabled only if "bootstrap_style" is true.
      'exclude_cols' => '', // String as array (not assoc); For example `col1,col2,col3,...`
      'add_class' => '', // Separator is a single-byte space character
      // As legacy of `cdbt-extract` is follows:
      'display_index_row' => true, 
      'narrow_keyword' => '', // String as array (not assoc) is `find_data()`; For example `keyword1,keyword2,...` Or String as hash is `get_data()`; For example `col1:keyword1,col2:keyword2,...`
      'display_cols' => '', // String as array (not assoc); For example `col1,col2,col3,...` If overlapped with `exclude_cols`, set to override the `exclude_cols`.
      'order_cols' => '', // String as array (not assoc); For example `col3,col2,col1,...` If overlapped with `display_cols`, set to override the `display_cols`.
      'sort_order' => 'created:desc', // String as hash for example `updated:desc,ID:asc,...`
      'limit_items' => '', // The default value is overwritten by the value of the max_show_records of the specified table.
      'image_render' => '', // class name for directly image render: 'rounded', 'circle', 'thumbnail', 'responsive', (until 'minimum', 'modal' )
      // Added new attribute from 2.0.0 is follows:
      'display_filter' => false, // Is enabled only if "bootstrap_style" is true.
      'filters' => '', // String as array (not assoc); For example `filter1,filter2,...`
      'display_view' => false, //  Is enabled only if "bootstrap_style" is true.
      'thumbnail_column' => '', // Column name to be used as a thumbnail image (image binary or a URL of image must be stored in this column)
      'ajax_load' => false, // Is enabled only if "bootstrap_style" is true.
      'csid' => 0, // Valid value of "Custom Shortcode ID" is 1 or more integer. 
    ], $attributes) );
    if (empty($table) || !$this->check_table_exists($table)) 
     return;
    
    // Initialization process for the shortcode
    $shortcode_name = 'cdbt-view';
    $table_schema = $this->get_table_schema($table);
    $table_option = $this->get_table_option($table);
    if (false !== $table_option) {
      $table_type = $table_option['table_type'];
      $has_pk = !empty($table_option['primary_key']) ? true : false;
      $limit_items = empty($limit_items) || intval($limit_items) < 1 ? intval($table_option['show_max_records']) : intval($limit_items);
    } else {
      if (in_array($table, $this->core_tables)) 
        $table_type = 'wp_core';
      $has_pk = false;
      foreach ($table_schema as $column => $scheme) {
        if ($scheme['primary_key']) {
          $has_pk = true;
          break;
        }
      }
      $limit_items = empty($limit_items) || intval($limit_items) < 1 ? intval($this->options['default_per_records']) : intval($limit_items);
    }
    $content = '';
    
    // Check user permission
    $result_permit = false;
    if (isset($table_option['permission']) && isset($table_option['permission']['view_global']) && !empty($table_option['permission']['view_global'])) {
      // Standard from v2.0.0
      $result_permit = $this->is_permit_user($table_option['permission']['view_global']);
    } else
    if (isset($table_option['roles']) && isset($table_option['roles']['view_role'])) {
      // As legacy v.1.x
      foreach(array_reverse($this->user_roles) as $role_name) {
        $_role = get_role($role_name);
        if (is_object($_role) && array_key_exists('level_' . $table_option['roles']['view_role'], $_role->capabilities)) {
          $check_role = $_role->name;
          break;
        }
      }
      $result_permit = $this->is_permit_user( $check_role );
    } else
    if ('wp_core' === $table_type) {
      // If WordPress core tables
      $result_permit = $this->is_permit_user( 'administrator' );
    }
    //
    // Filter the viewing rights check result of the shortcode
    // You can give viewing rights to specific users by utilizing this filter hook.
    //
    $result_permit = apply_filters( 'cdbt_after_shortcode_permit', $result_permit, $shortcode_name, $table );
    if (!$result_permit) 
      return sprintf('<p>%s</p>', __('You do not have viewing permits of this content.', CDBT));
    
    
    // Validation of the attributes, then sanitizing
    $boolean_atts = [ 'bootstrap_style', 'display_list_num', 'display_search', 'display_title', 'enable_sort', 'display_index_row', 'display_filter', 'ajax_load' ];
    foreach ($boolean_atts as $attribute_name) {
      ${$attribute_name} = $this->strtobool(${$attribute_name});
    }
    $not_assoc_atts = [ 'exclude_cols', 'display_cols', 'order_cols', 'filters' ];
    foreach ($not_assoc_atts as $attribute_name) {
      ${$attribute_name} = $this->strtoarray(${$attribute_name});
    }
    $hash_atts = [ 'narrow_keyword', 'sort_order' ];
    foreach ($hash_atts as $attribute_name) {
      ${$attribute_name} = $this->strtohash(${$attribute_name});
    }
    if (!empty($add_class)) {
      $add_classes = [];
      foreach (explode(' ', $add_class) as $_class) {
        $add_classes[] = esc_attr(trim($_class));
      }
      $add_class = implode(' ', $add_classes);
    }
    if (!empty($image_render) && !in_array(strtolower($image_render), [ 'rounded', 'circle', 'thumbnail', 'responsive' ])) {
      $image_render = 'responsive';
    } else {
      $image_render = strtolower($image_render);
    }
    if ($this->validate->checkInt($csid)) {
      // csidに対応したショートコードが存在するかのチェックを行う
    } else {
      $csid = 0;
    }
    if ($display_title) {
      $disp_title = $this->get_table_comment($table);
      $disp_title = !empty($disp_title) ? $disp_title : $table;
      $title = '<h4 class="sub-description-title">' . sprintf( __('View Data in "%s" Table', CDBT), $disp_title ) . '</h4>';
    }
    
    $datasource = $this->get_data($table, 'ARRAY_A');
    if (empty($datasource))
      return sprintf('<p>%s</p>', __('Data in this table does not exist.', CDBT));
    
    if ($bootstrap_style) {
      // Generate repeater
      $columns = [];
      foreach ($table_schema as $column => $scheme) {
        $columns[] = [
          'label' => empty($scheme['logical_name']) ? $column : $scheme['logical_name'], 
          'property' => $column, 
          'sortable' => true, 
          'sortDirection' => 'asc', 
          'dataNumric' => $this->validate->check_column_type( $scheme['type'], 'numeric' ), 
          'className' => '', 
        ];
      }
      
      if ('regular' === $table_type && $display_list_num) {
        foreach ($datasource as $i => $datum) {
          $datasource[$i] = array_merge([ 'data-index-number' => $i + 1 ], $datum);
        }
        $add_column = [ 'label' => '#', 'property' => 'data-index-number', 'sortable' => true, 'sortDirection' => 'asc', 'dataNumric' => true, 'width' => 80 ];
        array_unshift($columns, $add_column);
      }
      //
      // Filter the column definition of the list content that is output by this shortcode
      //
      $columns = apply_filters( 'cdbt_shortcode_custom_columns', $columns, $shortcode_name, $table );
      
      $conponent_options = [
        'id' => 'cdbt-repeater-' . $table, 
        'listSelectable' => 'false', 
        'pageIndex' => 1, 
        'pageSize' => $limit_items, 
        'columns' => $columns, 
        'data' => $datasource, 
        'addClass' => $add_class, 
      ];
      
      if (isset($title)) 
        echo $title;
      
      return $this->component_render('repeater', $conponent_options);
      
    } else {
      // Generate table layout
      
      return $content;
    }
  }
  
  
  /**
   * Render the data registration form for the specified table
   *
   * @since 1.0.0
   * @since 2.0.0 Have refactored logic.
   *
   * @param array $attributes [require] Array of attributes in shortcode
   * @param string $content [optional] For default is empty
   * @return string $html_content The created form contents
   **/
  public function entry_data_form() {
    list($attributes, $content) = func_get_args();
    extract( shortcode_atts([
      'table' => '', // Required attribute
      'bootstrap_style' => true, // 
      'display_title' => true, 
      'hidden_cols' => '', // String as array (not assoc); For example `col1,col2,col3,...`
      'add_class' => '', // Separator is a single-byte space character
      // Added new attribute from 2.0.0 is follows:
      'csid' => 0, // Valid value of "Custom Shortcode ID" is 1 or more integer. 
    ], $attributes) );
    if (empty($table) || !$this->check_table_exists($table)) 
     return;
    
    // Initialization process for the shortcode
    $shortcode_name = 'cdbt-entry';
    $table_schema = $this->get_table_schema($table);
    $table_option = $this->get_table_option($table);
    if (false !== $table_option) {
      $table_type = $table_option['table_type'];
    } else {
      if (in_array($table, $this->core_tables)) 
        $table_type = 'wp_core';
    }
    $content = '';
    
    // Check user permission
    $result_permit = false;
    if (isset($table_option['permission']) && isset($table_option['permission']['entry_global']) && !empty($table_option['permission']['entry_global'])) {
      // Standard from v2.0.0
      $result_permit = $this->is_permit_user($table_option['permission']['entry_global']);
    } else
    if (isset($table_option['roles']) && isset($table_option['roles']['input_role'])) {
      // As legacy v.1.x
      foreach(array_reverse($this->user_roles) as $role_name) {
        $_role = get_role($role_name);
        if (is_object($_role) && array_key_exists('level_' . $table_option['roles']['input_role'], $_role->capabilities)) {
          $check_role = $_role->name;
          break;
        }
      }
      $result_permit = $this->is_permit_user( $check_role );
    } else
    if ('wp_core' === $table_type) {
      // If WordPress core tables
      $result_permit = $this->is_permit_user( 'administrator' );
    }
    //
    // Filter the viewing rights check result of the shortcode
    // You can give viewing rights to specific users by utilizing this filter hook.
    //
    $result_permit = apply_filters( 'cdbt_after_shortcode_permit', $result_permit, $shortcode_name, $table );
    if (!$result_permit) 
      return sprintf('<p>%s</p>', __('You do not have viewing permits of this content.', CDBT));
    
    
    // Validation of the attributes, then sanitizing
    $boolean_atts = [ 'bootstrap_style', 'display_title' ];
    foreach ($boolean_atts as $attribute_name) {
      ${$attribute_name} = $this->strtobool(${$attribute_name});
    }
    $not_assoc_atts = [ 'hidden_cols' ];
    foreach ($not_assoc_atts as $attribute_name) {
      ${$attribute_name} = $this->strtoarray(${$attribute_name});
    }
    if (!empty($add_class)) {
      $add_classes = [];
      foreach (explode(' ', $add_class) as $_class) {
        $add_classes[] = esc_attr(trim($_class));
      }
      $add_class = implode(' ', $add_classes);
    }
    if ($this->validate->checkInt($csid)) {
      // csidに対応したショートコードが存在するかのチェックを行う
    } else {
      $csid = 0;
    }
    if ($display_title) {
      $disp_title = $this->get_table_comment($table);
      $disp_title = !empty($disp_title) ? $disp_title : $table;
      $title = '<h4 class="sub-description-title">' . sprintf( __('Entry Data to "%s" Table', CDBT), $disp_title ) . '</h4>';
    }
    
//    var_dump($this->cdbt_sessions);
//    var_dump($table_schema);
    
    $elements_options = [];
    $is_file_upload = false;
    foreach ($table_schema as $column => $scheme) {
      if ( $scheme['primary_key'] && false !== strpos( $scheme['extra'], 'auto_increment' ) ) 
        continue;
      
      $detect_column_type = $this->validate->check_column_type($scheme['type']);
      if( array_key_exists('datetime', $detect_column_type) && 'updated' === $column ) 
        continue;
      
//      var_dump([$column, $detect_column_type, $scheme]);
      unset($input_type, $rows, $max_file_size, $max_length, $element_size, $pattern, $selectable_list);
      if (array_key_exists('char', $detect_column_type)) {
        if (array_key_exists('text', $detect_column_type)) {
          $input_type = 'textarea';
          // $max_length = $scheme['max_length'];
          if ('longtext' === $detect_column_type['text']) {
            $rows = 20;
          } else
          if ('midiumtext' === $detect_column_type['text']) {
            $rows = 15;
          } else
          if ('tinytext' === $detect_column_type['text']) {
            $rows = 5;
          } else {
            $rows = 10;
          }
        } else
        if (array_key_exists('blob', $detect_column_type)) {
          $input_type = 'file';
          $max_file_size = $scheme['max_length'];
          $is_file_upload = true;
        } else {
          $input_type = 'text';
          $max_length = $scheme['max_length'];
        }
      } else
      if (array_key_exists('numeric', $detect_column_type)) {
        if (array_key_exists('integer', $detect_column_type)) {
          $input_type = 'number';
          if ($scheme['unsigned']) 
            $min = 0;
          $element_size = ceil($scheme['max_length'] / 10);
          $pattern = $scheme['unsigned'] ? '^[0-9]+$' : '^(\-|)[0-9]+$';
        } else
        if (array_key_exists('binary', $detect_column_type)) {
          $input_type = 'boolean';
          if (preg_match('/^b\'(.*)\'$/iU', $scheme['default'], $matches) && is_array($matches) && array_key_exists(1, $matches)) {
            $scheme['default'] = $this->strtobool($matches[1]);
          }
        } else {
          $input_type = 'text';
          $element_size = ceil($scheme['max_length'] / 10);
          $pattern = $scheme['unsigned'] ? '^[0-9]{0,}(|\.)[0-9]+$' : '^(\-|)[0-9]{0,}(|\.)[0-9]+$';
        }
      } else
      if (array_key_exists('list', $detect_column_type)) {
        $input_type = 'enum' === $detect_column_type['list'] ? 'select' : 'checkbox';
        $selectable_list = [];
        foreach ($this->parse_list_elements($scheme['type_format']) as $list_value) {
          $selectable_list[] = sprintf( '%s:%s', __($list_value, CDBT), esc_attr($list_value) );
        }
        unset($list_value);
      } else
      if (array_key_exists('datetime', $detect_column_type)) {
        $input_type = 'timestamp' === $detect_column_type['datetime'] ? 'number' : 'datetime';
      } else {
        $input_type = 'text';
      }
//var_dump([$column, $scheme]);
      $_temp_elements_options = [
        'elementName' => $column, 
        'elementLabel' => !empty($scheme['logical_name']) ? $scheme['logical_name'] : $column, 
        'elementType' => $input_type, 
        'isRequired' => $scheme['not_null'], 
        'defaultValue' => !empty($scheme['default']) ? $scheme['default'] : '', 
        'placeholder' => '', 
        'addClass' => '', 
        'selectableList' => isset($selectable_list) && !empty($selectable_list) ? implode(',', $selectable_list) : '', 
        'horizontalList' => false, 
        'elementSize' => isset($element_size) && !empty($element_size) ? $element_size : '', 
        'helperText' => '', 
        'elementExtras' => [], // 'maxlength' => '', 'pattern' => '', 
      ];
      if (isset($max_length) && !empty($max_length)) 
        $_temp_elements_options['elementExtras']['maxlength'] = $max_length;
      if (isset($pattern) && !empty($pattern)) 
        $_temp_elements_options['elementExtras']['pattern'] = $pattern;
      if (isset($rows) && !empty($rows)) 
        $_temp_elements_options['elementExtras']['rows'] = $rows;
      if ('datetime' === $input_type) {
        $_temp_elements_options['elementExtras']['data-moment-locale'] = 'ja';
        $_temp_elements_options['elementExtras']['data-moment-format'] = 'L';
      }
      
      $elements_options[] = $_temp_elements_options;
    }
    //
    // Filter the form content definition that is output by this shortcode
    //
    $elements_options = apply_filters( 'cdbt_shortcode_custom_forms', $elements_options, $shortcode_name, $table );
    
    $conponent_options = [
      'id' => 'cdbt-entry-data-to-' . $table, 
      'entryTable' => $table, 
      'useBootstrap' => true, 
      'outputTitle' => isset($title) ? $title : '', 
      'fileUpload' => isset($is_file_upload) ? $is_file_upload : false, 
      'formElements' => $elements_options, 
    ];
    
    return $this->component_render('forms', $conponent_options);
    
  }
  
  
  /**
   * The registration data is validation and sanitization and  rasterization data is inserted into the table.
   *
   * @since 2.0.0
   *
   * @param string $table_name [require]
   * @param array $post_data [require]
   * @return boolean
   */
  protected function register_data( $table_name=null, $post_data=[] ) {
    
    $table_schema = $this->get_table_schema($table_name);
    $regist_data = [];
    foreach ($post_data as $post_key => $post_value) {
      if (array_key_exists($post_key, $table_schema)) {
        $detect_column_type = $this->validate->check_column_type($table_schema[$post_key]['type']);
        
        if (array_key_exists('char', $detect_column_type)) {
          if (array_key_exists('text', $detect_column_type)) {
            // Sanitization data from textarea
            $allowed_html_tags = [ 'a' => [ 'href' => [], 'title' => [] ], 'br' => [], 'em' => [], 'strong' => [] ];
            $regist_data[$post_key] = tag_escape(wp_kses($post_value, $allowed_html_tags)); 
          } else {
            // Sanitization data from text field
            if (is_email($post_value)) {
              $regist_data[$post_key] = sanitize_email($post_value);
            } else {
              $regist_data[$post_key] = sanitize_text_field($post_value);
            }
          }
        }
        
        if (array_key_exists('numeric', $detect_column_type)) {
          if (array_key_exists('integer', $detect_column_type)) {
            // Sanitization data of integer
            $regist_data[$post_key] = $table_schema[$post_key]['unsigned'] ? absint($post_value) : intval($post_value);
          } else
          if (array_key_exists('float', $detect_column_type)) {
            // Sanitization data of float
            $regist_data[$post_key] = 'decimal' === $detect_column_type['float'] ? strval(floatval($post_value)) : floatval($post_value);
          } else
          if (array_key_exists('binary', $detect_column_type)) {
            // Sanitization data of bainary bit
            $regist_data[$post_key] = sprintf("b'%s'", decbin($post_value));
          } else {
            $regist_data[$post_key] = intval($post_value);
          }
        }
        
        if (array_key_exists('list', $detect_column_type)) {
          if ('enum' === $detect_column_type['list']) {
            // Validation data of enum element
            if (in_array($post_value, $this->parse_list_elements($table_schema[$post_key]['type_format']))) {
              $regist_data[$post_key] = $post_value;
            } else {
              $regist_data[$post_key] = $table_schema[$post_key]['default'];
            }
          } else
          if ('set' === $detect_column_type['list']) {
            $post_value = is_array($post_value) ? $post_value : (array)$post_value;
            $list_array = $this->parse_list_elements($table_schema[$post_key]['type_format']);
            $_save_array = [];
            foreach ($post_value as $item) {
              if (in_array($item, $list_array)) 
                $_save_array[] = $item;
            }
            $regist_data[$post_key] = implode(',', $_save_array);
            unset($list_array, $_save_array, $item);
          }
        }
        
        if (array_key_exists('datetime', $detect_column_type)) {
//          var_dump([$post_key, $post_value]);
          if (is_array($post_value)) {
            if (array_key_exists('date', $post_value)) {
              if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $post_value['date'], $matches) && is_array($matches) && array_key_exists(3, $matches)) {
                $_date = sprintf('%04d-%02d-%02d', $matches[3], $matches[1], $matches[2]);
              } else {
                $_date = $post_value['date'];
              }
            } else {
              $_date = '';
            }
            $_hour = $_minute = $_second = '00';
            foreach (['hour', 'minute', 'second'] as $key) {
              if (array_key_exists($key, $post_value) && $this->validate->checkDigit($post_value[$key]) && $this->validate->checkLength($post_value[$key], 2, 2)) {
                if ('hour' === $key) {
                  $_hour = $this->validate->checkRange(intval($post_value[$key]), 0, 23) ? $post_value[$key] : '00';
                } else {
                  if ('minute' === $key) {
                    $_minute = $this->validate->checkRange(intval($post_value[$key]), 0, 59) ? $post_value[$key] : '00';
                  } else {
                    $_second = $this->validate->checkRange(intval($post_value[$key]), 0, 59) ? $post_value[$key] : '00';
                  }
                }
              }
            }
            if (isset($_date) && isset($_hour) && isset($_minute) && isset($_second)) {
              $regist_data[$post_key] = sprintf('%s %s:%s:%s', $_date, $_hour, $_minute, $_second);
            } else {
              $regist_data[$post_key] = !empty($_date.$_hour.$_minute.$_second) ? $_date.$_hour.$_minute.$_second : $table_schema[$post_key]['default'];
            }
          } else {
            $regist_data[$post_key] = empty($post_value) ? $table_schema[$post_key]['default'] : $post_value;
          }
          if (!$this->validate->checkDateTime($regist_data[$post_key], 'Y-m-d H:i:s')) {
            $regist_data[$post_key] = '0000-00-00 00:00:00';
          }
          unset($_date, $_hour, $_minute, $_second);
        }

//var_dump($detect_column_type);
        
        
      }
    }
    var_dump($regist_data);
//    var_dump($table_name);
//    var_dump($post_data);
    var_dump($_FILES);
    
    return false;
  }



}