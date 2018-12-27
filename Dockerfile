FROM node:10-alpine
LABEL author=craig@craigrueda.com

WORKDIR /app

#
# Copy in just the package.json and run npm in order to 
# take advantage of cached layers
#
COPY package*.json ./
RUN npm install --production

#
# Now, copy in the dist folder which was built/tested in CI...
#
COPY dist ./dist

ENV PORT=8080 \
    NODE_ENV=production
    
EXPOSE 8080
CMD [ "npm", "start" ]