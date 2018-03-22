module.exports = function(grunt) {
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');

	// Project configuration.
	grunt.initConfig({
		watch: {
			files: ['*.js'],
			tasks: ['default']
		},

		jshint: {
			all: ['*.js']
		}
	});

	grunt.registerTask('default', ['jshint']);
};
