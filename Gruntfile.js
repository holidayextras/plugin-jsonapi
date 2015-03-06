/* jslint node: true */
'use strict';

/*
* @name /Gruntfile.js
* @description Le Gruntfile...
*              keep this tidy, alphabeticised etc
* @since Fri Sep 26 2014
* @author Kevin Hodges <kevin.hodges@holidayextras.com>
*/

module.exports = function( grunt ) {

	// project configuration
	grunt.initConfig( {
		mochaTest: {
			test: {
				options: {
					reporter: 'spec',
				},
				src: ['test/**/*Test.js']
			}
		},
		jshint: {
			options: {
				jshintrc: '.jshintrc'
			},
			core: {
				src: ['*.js', 'lib/**/*.js']
			},
			test: {
				src: ['test/**/*.js']
			}
		},
		jscs: {
			options: {
				config: 'shortbreaks.jscs.json'
			},
			src: ['<%= jshint.core.src %>', '<%= jshint.test.src %>']
		}
	} );

	// load tasks from the specified grunt plugins...
	grunt.loadNpmTasks( 'grunt-mocha-test' );
	grunt.loadNpmTasks( 'grunt-contrib-jshint' );
	grunt.loadNpmTasks( 'grunt-jscs' );

	// register task alias'
	grunt.registerTask( 'test', ['jshint', 'jscs', 'mochaTest'] );

};