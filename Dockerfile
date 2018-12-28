FROM node:10-alpine
LABEL author=craig@craigrueda.com

WORKDIR /app

# Do everything as the 'node' user...
RUN chown -R node:node /app
USER node

#
# Copy in just the package.json and run npm in order to 
# take advantage of cached layers
#
COPY --chown=node:node package*.json ./
RUN npm install --production

#
# Now, copy in the dist folder which was built/tested in CI...
#
COPY --chown=node:node dist ./dist

ENV PORT=8080 \
    NODE_ENV=production
    
EXPOSE 8080
CMD [ "npm", "start" ]