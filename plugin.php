<?php
/**
 * Plugin Name: Bynder
 * Description: Allows users to easily import and use their Bynder images and videos directly in WordPress, helping brands save time and maintain consistency. Requires at least WordPress 5.0. Tested up to WordPress 5.3.
 * Author: Bynder BV
 * Author URI: https://www.bynder.com/
 * Version: 4.1.1
 *
 * @package bynder-wordpress
 * @author Bynder
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function array_get($array, $key, $default = null) {
	return isset($array[$key]) ? $array[$key]: $default;
}

/**
 * Block Initializer.
 */
require_once plugin_dir_path( __FILE__ ) . 'src/init.php';

/**
 * Settings
 */

add_action( 'admin_menu', 'bynder_add_admin_menu' );
add_action( 'admin_init', 'bynder_settings_init' );

function bynder_add_admin_menu() {
	add_options_page(
		'bynder',
		'Bynder',
		'manage_options',
		'bynder',
		'bynder_options_page'
	);
}

function bynder_settings_init() {
	register_setting(
		'bynder',
		'bynder_settings',
		array( 'sanitize_callback' => 'bynder_sanitize_settings' )
	);

	add_settings_section(
		'bynder_settings_general',
		'General',
		null,
		'bynder'
	);

	add_settings_section(
		'bynder_settings_derivatives',
		'Derivatives',
		'bynder_settings_derivatives_section_callback',
		'bynder'
	);

	add_settings_field(
		'bynder_domain',
		'Portal domain',
		field ( 'domain', 'Used to synchronize asset usage and set the domain in Compact View. E.g. myportal.getbynder.com' ),
		'bynder',
		'bynder_settings_general'
	);

	add_settings_field(
		'bynder_permanent_token',
		'Permanent token',
		field(
			'permanent_token',
			'Used to fetch derivatives and sync usage. Read more about permanent tokens ' .
			'<a target="blank" href="https://help.bynder.com/system/oauth2-permanent-tokens.htm">here</a>'
		),
		'bynder',
		'bynder_settings_general'
	);

	add_settings_field(
		'bynder_default_search_term',
		'Default search term',
		field( 'default_search_term', 'When set, Compact View will automatically search for the entered value' ),
		'bynder',
		'bynder_settings_general'
	);

	add_settings_field(
		'bynder_image_derivative',
		'Image derivative',
		'bynder_image_derivative_field_render',
		'bynder',
		'bynder_settings_derivatives'
	);
}

function bynder_sanitize_settings($values) {
	$existing_values = get_option( 'bynder_settings' );
	if(!$existing_values) {  // Passing default to get_option does not seem to work.
		$existing_values = array();
	}

	if($values['domain'] != '') {
		if ( !preg_match('/^([a-z-]+\.)?[a-z-]+\.[a-z]+$/', $values['domain']) ) {
			$values['domain'] = $existing_values['domain'];
			add_settings_error(
				'bynder_settings',
				'_',
				'Invalid domain, please only enter the domain name',
				'error'
			);
		}
	}

	return array_merge($existing_values, $values);
}

function bynder_settings_derivatives_section_callback() {
	$settings = get_option( 'bynder_settings' );
    echo '<p>Defines which public derivative will be used after an asset is selected from Compact View. When not configured or available for the selected asset, the webImage will be used as fallback.</p>';

	if ($settings['domain'] != "" && $settings['permanent_token'] != "") {
		echo '<a class="button button-secondary" href="?page=bynder&action=fetchDerivatives">Fetch derivatives</a>';
	} else {
		echo '<a class="button button-disabled">Fetch derivatives</a>';
		echo '<em> You must configure both the portal domain and permanent token to fetch derivatives.</em>';
	}
}

function field( $name, $description ) {
	return function () use ( $name, $description ) {
		$settings = get_option( 'bynder_settings' );
		echo '<input type="text" class="regular-text" name="bynder_settings[' . $name . ']" value="' . $settings[$name] . '" />';
		echo '<p class="description">' . $description . '</p>';
	};
}

function bynder_image_derivative_field_render() {
	$settings = get_option( 'bynder_settings' );

	if(!isset($settings['available_derivatives'])) {
		echo '<p class="description"><em>Please fetch derivatives first</em></p>';
		return;
	}

	$availableDerivatives = array_merge([''], $settings['available_derivatives']);
	echo '<select name="bynder_settings[image_derivative]">';
	foreach($availableDerivatives as $derivative) {
		$selected = $derivative == $settings['image_derivative'] ? 'selected' : '';
		echo '<option ' . $selected . '>' . $derivative . '</option>';
	}
	echo '</select>';
}

function bynder_fetch_derivatives() {
	$settings = get_option( 'bynder_settings' );

	if ($settings['domain'] == '' || $settings['permanent_token'] == '') {
		echo '<p>Domain or permanent token not configured!</p>';
		return;
	}

	$url = 'https://' . $settings['domain'] . '/api/v4/account/derivatives';
	$data = wp_remote_get( $url, array(
		'headers' => array(
			'Authorization' => 'Bearer ' . $settings['permanent_token'],
			'Content-Type' => 'application/json; charset=utf-8',
		)
	));

	if(!is_array($data) || $data['response']['code'] != 200) {
		echo '<p>Could not fetch derivatives, please verify domain and permanent token are configured correctly.</p>';
		return;
	}

	$derivatives = array_filter(json_decode($data['body']), function($derivative) {
		return $derivative->isPublic && !$derivative->isOnTheFly;
	});

	$settings['available_derivatives'] = array_map(function($derivative) {
		return $derivative->prefix;
	}, $derivatives);
	asort($settings['available_derivatives']);

	update_option('bynder_settings', $settings);

	echo '<p>The following custom derivatives were retrieved:</p><ul class="ul-disc">';
	foreach ($settings['available_derivatives'] as $derivative) {
		echo '<li>' . $derivative . '</li>';
	}
	echo '</ul>';
}

function bynder_options_page() {
	if(array_get($_GET, 'action') == 'fetchDerivatives') {
		bynder_fetch_derivatives();
		echo '<a class="button button-primary" href="?page=bynder">Go back</a>';
		return;
	}
	echo '<h1>Bynder Settings</h1>';
	echo '<form action="options.php" method="post">';
	settings_fields( 'bynder' );
	do_settings_sections( 'bynder' );
	submit_button();
	echo '</form>';
}

/**
 * Asset tracking
 */

register_activation_hook(__FILE__, 'bynder_schedule_cron');
register_deactivation_hook(__FILE__, 'bynder_clear_scheduled_cron');
add_action('bynder_sync_usage_cron', 'bynder_sync_usage');

function bynder_schedule_cron() {
	if ( !wp_next_scheduled( 'bynder_sync_usage_cron' ) ) {
		wp_schedule_event( time(), 'hourly', 'bynder_sync_usage_cron' );
	}
}

function bynder_clear_scheduled_cron() {
	wp_clear_scheduled_hook('bynder_sync_usage_cron');
}

function bynder_submit_usage( $settings, $data ) {
	$url = 'https://' . $settings['domain'] . '/api/media/usage/sync';

	wp_remote_post( $url, array(
		'headers' => array(
			'Authorization' => 'Bearer ' . $settings['permanent_token'],
			'Content-Type' => 'application/json; charset=utf-8',
		),
		'body' => json_encode( $data ),
		'method' => 'POST',
		'data_format' => 'body'
	));
}

function bynder_sync_usage() {
	$settings = get_option( 'bynder_settings' );
	if ($settings['domain'] == '' || $settings['permanent_token'] == '') {
		return;
	}

	$query = new WP_Query( [
		'post_type' => array( 'post', 'page' ),
		'post_status' => array( 'any', 'trash')
	] );

	$syncData = array(
		'integration_id' => 'b242c16d-70f4-4101-8df5-87b35bbe56f0',
		'uris' => array(),
		'usages' => array()
	);

	foreach ( $query->posts as $post ) {
		array_push( $syncData['uris'], $post->guid );

		preg_match_all( '/data-bynder-id="(.*?)"/', $post->post_content, $matches );
		if ( empty( $matches[1] ) ) {
			continue;
		}

		foreach ( $matches[1] as $assetId ) {
			array_push( $syncData['usages'], array(
				'asset_id' => $assetId,
				'uri' => $post->guid,
				'additional' => $post->post_title
			) );
		}
	}

	bynder_submit_usage( $settings, $syncData );
}
