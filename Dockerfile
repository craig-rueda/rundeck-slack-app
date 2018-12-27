FROM node:10-alpine

WORKDIR /usr/src/app

#
# Copy in just the package.json and run npm in order to 
# take advantage of cached layers
#
COPY package*.json ./
RUN npm install --production

#
# Now, copy in the src and build everything
#
COPY . .
RUN npm run build

ENV PORT=8080 \
    NODE_ENV=production
    
EXPOSE 8080
CMD [ "npm", "start" ]