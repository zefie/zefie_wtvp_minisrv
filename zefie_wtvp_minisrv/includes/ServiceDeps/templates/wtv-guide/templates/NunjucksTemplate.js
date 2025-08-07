const nunjucks = require('nunjucks');
const path = require('path');

class WTVNunjucksTemplate {
    page_args = {};

    constructor(page_args) {
        this.page_args = page_args;
    }

    getTemplatePage() {
        // Configure nunjucks with the templates directory
        const templatesPath = path.join(__dirname, '../templates');
        const env = nunjucks.configure(templatesPath, { 
            autoescape: true,
            throwOnUndefined: false
        });

        try {
            // Render the template with the provided arguments
            const rendered = env.render(this.page_args.template_name, this.page_args);
            return rendered;
        } catch (error) {
            console.error('Error rendering Nunjucks template:', error);
            return null;
        }
    }
}

module.exports = WTVNunjucksTemplate;
