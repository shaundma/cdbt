<?php

namespace CustomDataBaseTables\Lib;


if ( !class_exists( 'CdbtUtility' ) ) :
/**
 * Utility functions class for plugins
 *
 * @since CustomDataBaseTables v2.0.0
 */
class CdbtUtility {

  /**
   * Stored the last message at the time of logger method call as a cache
   */
  protected $logger_cache;

  public function __construct() {
    
    $this->setup_globals();
    
  }

  public function __destruct() { return true; }

  private function setup_globals() {
    global $cdbt;
    if (!isset($cdbt)) 
      $cdbt = $this;
  }


  /**
   * Logger for this plugin
   *
   * @since 2.0.0
   *
   * @param string $message
   * @param integer $logging_type 0: php system logger, 1: mail to $distination, 3: overwriting file of $distination (default), 4: to SAPI handler
   * @param string $distination
   * @return boolean
   */
  public function logger( $message='', $logging_type=3, $distination='' ) {
    if ( !defined( 'CDBT' ) ) 
      return;
    
    $options = get_option( CDBT );
    $this->logger_cache = $message;
    
    if (!$options['debug_mode']) 
      return;
    
    if (empty($message) || '' === trim($message)) {
      if (!is_wp_error($this->errors) || empty($this->errors->get_error_message())) 
        return;
      
      $message = apply_filters( 'cdbt_log_message', $this->errors->get_error_message(), $this->errors );
    }
    
    if (!in_array(intval($logging_type), [ 0, 1, 3, 4 ])) 
      $logging_type = 3;
    
    $current_datetime = date('Y-m-d H:i:s', time());
    $message = preg_replace( '/(?:\n|\r|\r\n)/', ' ', trim($message) );
    $log_message = sprintf("[%s] %s\n", $current_datetime, $message);
    
    if (3 == intval($logging_type)) {
      $this->log_distination_path = empty($message) || '' === trim($distination) ? str_replace('lib/', 'debug.log', plugin_dir_path(__FILE__)) : $distination;
      $this->log_distination_path = apply_filters( 'cdbt_log_distination_path', $this->log_distination_path );
    }
    
    if (false === error_log( $log_message, $logging_type, $this->log_distination_path )) {
      $this->errors = new \WP_Error();
      $this->errors->add( 'logging_error', __('Failed to logging.', $this->domain_name) );
      return false;
    } else {
      return true;
    }
  }


  /**
   * Outputting the hook information to the javascript console at the time of each hook call.
   *
   * @since 2.0.0
   *
   * @param string $functon callback function name of hook
   * @param string $type 'Action' or 'Filter'
   * @param boolean $display Whether echo the javascript
   * @return void
   */
  public function console_hook_name( $function, $type, $display=true ) {
    $parse_path = explode("\\", $function);
    $hook_name = array_pop($parse_path);
    if ($display) {
      printf('<script>if(window.console&&typeof window.console.log==="function"){console.log("%s : %sHook (%s)");}</script>', str_replace('my_', '', $hook_name), $type, $hook_name);
    }
  }


  /**
   * This process download the file when exporting table data.
   *
   * @since 2.0.0
   *
   * @param array $data_sources [require]
   * @return boolean
   */
  public function download_file( $data_sources ) {
    static $message = '';
    $notice_class = CDBT . '-error';
    
    $add_index_line = isset($data_sources['add_index_line']) && !empty($data_sources['add_index_line']) ? true : false;
    $output_encoding = isset($data_sources['output_encoding']) && !empty($data_sources['output_encoding']) ? $data_sources['output_encoding'] : '';
    if (empty($output_encoding) && function_exists('mb_internal_encoding')) 
      $output_encoding = mb_internal_encoding();
    
    $file_name = sprintf('%s.%s', $data_sources['export_table'], $data_sources['export_filetype']);
    $raw_data = $this->get_data( $data_sources['export_table'], $data_sources['export_columns'] );
    
    $download_ready = true;
    switch ($data_sources['export_filetype']) {
      case 'csv': 
      case 'tsv': 
        $raw_array = json_decode(json_encode($raw_data), true);
        $escaped_data = [];
        $current_encoding = [];
        if ($add_index_line) {
          $escaped_data[] = '"' . implode('","', $data_sources['export_columns']) . '"';
        }
        foreach ($raw_array as $raw_row) {
          $escaped_row = $this->esc_xsv($raw_row, $data_sources['export_filetype']);
          if (function_exists('mb_detect_encoding')) 
            $current_encoding[] = mb_detect_encoding($escaped_row);
          $escaped_data[] = $escaped_row;
        }
        if (!empty($output_encoding) && function_exists('mb_convert_variables')) {
          mb_convert_variables($output_encoding, implode(',', array_unique($current_encoding)), $escaped_data);
        }
        $output_data = implode("\n", $escaped_data);
        $file_size = strlen($output_data);
        
        break;
      case 'json': 
        $json_data = json_encode($raw_data);
        $current_encoding = function_exists('mb_detect_encoding') ? mb_detect_encoding($json_data) : 'UTF-8';
        if (!empty($output_encoding) && function_exists('mb_convert_encoding')) {
          $output_data = mb_convert_encoding($json_data, $output_encoding, $current_encoding);
        } else {
        	$output_data = $json_data;
        }
        $file_size = strlen($output_data);
        
        break;
      case 'sql': 
        // if (false !== system('mysqldump --version')) 
        if (preg_match('/^mysqldump\s(.*)Ver\s(.*)Distrib.*$/iU', exec('mysqldump --version'), $matches) && is_array($matches) && array_key_exists(2, $matches)) {
          
          $cmd = sprintf('mysqldump -u %s -p%s -h %s %s %s', DB_USER, DB_PASSWORD, DB_HOST, DB_NAME, $data_sources['export_table']);
          $temp = tmpfile();
          exec($cmd, $retval);
          fwrite($temp, $retval[0]);
          fseek($temp, 0);
          $output_data = fread($temp, 8192);
//          $output_data = file_get_contents($temp);
          fclose($temp);
          
//          var_dump($output_data);
          $download_ready = false;
          
        } else {
        	$download_ready = false;
        }
        
        break;
      default:
        $download_ready = false;
        
        break;
    }
    
    if ($download_ready) {
      try {
        header( 'Content-Type: application/octet-stream' );
        header( 'Content-Disposition: attachment; filename=' . $file_name );
        header( 'Content-Length: ' . $file_size );
        $fp = fopen('php://output', 'w');
        fwrite($fp, $output_data);
        fclose($fp);
        
        $download_result = true;
        $notice_class = CDBT . '-notice';
        $message = __('Export of table data has been completed successfully.', CDBT);
        
      } catch(Exception $e) {
        
        $download_result = false;
        $message = __('Failed in the export of table data.', CDBT);
        
      }
    } else {
      $download_result = false;
      $message = __('Failed to export, because could not generate the download file.', CDBT);
    }
    
    $this->logger( $message );
    $this->download_result = $download_result;
    $this->download_message = $message;
    return $download_result;
    
  }


  /**
   * Escape an array as a single line string for CSV or TSV
   *
   * @since 2.0.0
   *
   * @param array $base_array [require]
   * @param string $file_type [require] `csv` or `tsv`
   * @return string Escaped row string
   */
  public function esc_xsv( $base_array, $file_type='csv' ) {
    if (!is_array($base_array)) 
      return;
    
    $escaped_array = [];
    foreach ($base_array as $k => $v) {
      $v = str_replace('"', '""', $v);
      $v = str_replace(',', '","', $v);
      $v = str_replace("\t", chr(9), $v);
      $v = str_replace(["\r\n", "\r", "\n"], chr(10), $v);
      $escaped_array[$k] = $v;
    }
    
    $separator = 'csv' === $file_type ? '","' : '"' . chr(9) . '"';
    return '"' . implode($separator, $escaped_array) . '"';
    
  }
  
  
  /**
   * User permission checker
   *
   * @since 2.0.0
   *
   * @param array $compare_caproles [require]
   * @return boolean
   */
  public function is_permit_user( $compare_caproles=[] ) {
    if (empty($compare_caproles)) 
      return false;
    
    $current_user = wp_get_current_user();
    $current_user_capabilities = array_keys($current_user->caps);
    $current_user_capabilities = empty($current_user_capabilities) ? 'level_0' : $current_user_capabilities;
    $has_caproles = [];
    foreach ($current_user_capabilities as $role_name) {
      $_temp = get_role($role_name);
      $has_caproles[] = $_temp->name;
      foreach ($_temp->capabilities as $cap => $v) {
        if ($v) $has_caproles[] = $cap;
      }
    }
    
    $check_caproles = [];
    foreach ($compare_caproles as $role_name) {
      if ('guest' === $role_name) 
        $role_name = 'subscriber';
      
      $_temp = get_role($role_name);
      $check_caproles[] = $_temp->name;
      foreach ($_temp->capabilities as $cap => $v) {
        if ($v) $check_caproles[] = $cap;
      }
    }
    
    foreach ($check_caproles as $caprole) {
      if (in_array($caprole, $has_caproles)) 
        return true;
    }
    return false;
    
  }
  
  
  /**
   * Convert to array from string like array
   *
   * @since 2.0.0
   *
   * @param string $string [require]
   * @return mixed Return array if conversion success, False otherwise
   */
  public function strtoarray( $string=null ) {
    if (empty($string)) 
      return false;
    
    $_ary = explode(',', trim($string));
    $fixed_ary = [];
    foreach ($_ary as $_val) {
      $_val = trim($_val);
      if (empty($_val) || 0 === strlen($_val)) {
        continue;
      } else {
        $fixed_ary[] = $_val;
      }
    }
    
    if (!empty($fixed_ary)) 
      return $fixed_ary;
    
    return false;
    
  }
  
  
  /**
   * Convert to object or array from string like hash
   *
   * @since 2.0.0
   *
   * @param string $string [require]
   * @param string $var_type [optional] Whether return value is at assoc array or object. For default is `array`
   * @return mixed Return specified variables if conversion success, False otherwise
   */
  public function strtohash( $string=null, $var_type='array' ) {
    if (empty($string) || !in_array(strtolower($var_type), [ 'array', 'object' ])) 
      return false;
    
    
    if (!($_ary = $this->strtoarray($string))) 
      return false;
    
    $_assoc = [];
    foreach ($_ary as $_row) {
      if (strpos($_row, ':') !== false) {
        list($_key, $_val) = explode(':', $_row);
        $_key = trim(trim(stripcslashes(trim($_key)), "\"' "));
        $_val = trim(trim(stripcslashes(trim($_val)), "\"' "));
        if (!empty($_key) && strlen($_key) > 0) {
          $_assoc[$_key] = $_val;
        }
      } else {
        $_row = trim(trim(stripcslashes(trim($_row)), "\"' "));
        $_assoc[] = $_row;
      }
    }
    
    if (empty($_assoc)) 
      return false;
    
    if ('object' === strtolower($var_type)) 
      return (object)$_assoc;
    
    return $_assoc;
    
  }
  
  
  /**
   * Convert to boolean from string like boolean
   *
   * @since 2.0.0
   *
   * @param string $string [require]
   * @return boolean
   */
  public function strtobool( $string=null ) {
    $_boolstr = strval($string);
    if (empty($_boolstr) || !in_array(strtolower($_boolstr), [ 'true', 'false', '1', '0', 1, 0 ])) 
      return false;
    
    return in_array(strtolower($_boolstr), [ 'true', '1', 1 ]);
  }
  
  /**
   * Flatten the array or object that has nested
   *
   * @since 2.0.0
   *
   * @param mixed $data Array or Object
   * @param boolean $return_array Return an array if `true`, otherwise an object
   * @return mixed $data Array or Object specified by `return_array`
   */
  public function array_flatten( $data, $return_array=true ) {
    if (is_object($data)) 
      $data = json_decode(json_encode($data), true);
    
    if (is_array($data)) {
      if (!$this->is_assoc($data))
        $data = array_reduce($data, 'array_merge', []);
    }
    
    return $return_array ? (array) $data : (object) $data;
  }

  /**
   * Reference sequence is whether the associative array
   *
   * @since 2.0.0
   *
   * @param array $data This variable should be expected array
   * @return boolean
   */
  public function is_assoc( &$data ) {
    if (!is_array($data)) 
      return false;
    
    reset($data);
    list($k) = each($data);
    return $k !== 0;
  }

}

endif; // end of class_exists()