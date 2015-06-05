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
      'bootstrap_style' => true, 
      'display_list_num' => true, 
      'display_search' => true, 
      'display_title' => true, 
      'enable_sort' => true, 
      'exclude_cols' => '', // String as array (not assoc); For example `col1,col2,col3,...`
      'add_class' => '', 
      // As legacy of `cdbt-extract` is follows:
      'display_index_row' => true, 
      'narrow_keyword' => '', // String as array (not assoc) is `find_data()`; For example `keyword1,keyword2,...` Or String as hash is `get_data()`; For example `col1:keyword1,col2:keyword2,...`
      'display_cols' => '', // String as array (not assoc); For example `col1,col2,col3,...` If overlapped with `exclude_cols`, set to override the `exclude_cols`.
      'order_cols' => '', // String as array (not assoc); For example `col3,col2,col1,...` If overlapped with `display_cols`, set to override the `display_cols`.
      'sort_order' => 'created:desc', // String as hash for example `updated:desc,ID:asc,...`
      'limit_items' => '', // The default value is overwritten by the value of the max_show_records of the specified table.
      'image_render' => '', // class name for directly image render: 'rounded', 'circle', 'thumbnail', 'responsive', (until 'minimum', 'modal' )
      // Added new attribute from 2.0.0 is follows:
      'display_filter' => false, 
      'filters' => '', // String as array (not assoc); For example `filter1,filter2,...`
      'ajax_load' => false, 
      'csid' => 0, // Valid value of "Custom Shortcode ID" is 1 or more integer. 
    ], $attributes) );
    if (empty($table) || !$this->check_table_exists($table)) 
     return;
    
    // Get table status
    $table_schema = $this->get_table_schema($table);
    $table_option = $this->get_table_option($table);
    $has_pk = !empty($table_option['primary_key']) ? true : false;
    $limit_items = empty($limit_items) || intval($limit_items) < 1 ? intval($table_option['show_max_records']) : intval($limit_items);
    
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
      $result_permit = $this->is_permit_user([ $check_role ]);
    }
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
    
    
    
    $datasource = $this->get_data($table, 'ARRAY_A');
    
    $columns = [];
    foreach ($table_schema as $column => $scheme) {
      $columns[] = [
        'label' => empty($scheme['logical_name']) ? $column : $scheme['logical_name'], 
        'property' => $column, 
        'sortable' => true, 
        'sortDirection' => 'asc', 
        'dataNumric' => preg_match('/int/i', $scheme['type']) ? true : false, 
        'className' => '', 
      ];
    }
    
    if ('regular' === $table_option['table_type'] && $display_list_num) {
      foreach ($datasource as $i => $datum) {
        $datasource[$i] = array_merge([ 'data-index-number' => $i + 1 ], $datum);
      }
      $add_column = [ 'label' => '#', 'property' => 'data-index-number', 'sortable' => true, 'sortDirection' => 'asc', 'dataNumric' => true, 'width' => 80 ];
      array_unshift($columns, $add_column);
    }
    
    $conponent_options = [
      'id' => 'cdbt-repeater-' . $table, 
      'listSelectable' => 'false', 
      'pageIndex' => 1, 
      'pageSize' => $limit_items, 
      'columns' => $columns, 
      'data' => $datasource, 
    ];
    
    
    return $this->component_render('repeater', $conponent_options);
    
  }
  



}